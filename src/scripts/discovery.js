const sportyClient = require('../api/sportyClient');
const settings = require('../config/settings');
const formService = require('../services/predictor/FormService');
const HeuristicEngine = require('../services/predictor/HeuristicEngine');

async function collectAllResults(leagueId) {
    console.log(`[Collector] Fetching all historical results for league ${leagueId}...`);
    let allResults = [];
    let skip = 0;
    const take = 100;
    while (true) {
        try {
            const data = await sportyClient.getResults(leagueId, skip, take);
            if (!data || !data.rounds) break;

            const resultsArray = data.rounds.flatMap(round =>
                (round && Array.isArray(round.matches)) ? round.matches : []
            );

            if (resultsArray.length === 0) break;

            allResults.push(...resultsArray);
            console.log(`[Collector] Fetched ${allResults.length} matches...`);
            skip += take;
        } catch (err) {
            console.error(`[Collector] Error fetching at skip ${skip}: ${err.message}`);
            break;
        }
    }
    console.log(`[Collector] Total matches collected: ${allResults.length}`);
    return allResults;
}

function normalizeMatchData(rawMatch, rankingMap) {
    const [home, away] = (rawMatch.score || '0:0').split(':').map(Number);
    return {
        matchId: rawMatch.id,
        homeTeam: rawMatch.homeTeam.name,
        awayTeam: rawMatch.awayTeam.name,
        homeGoals: home || 0,
        awayGoals: away || 0,
        homeRank: rankingMap[rawMatch.homeTeam.name] || 10,
        awayRank: rankingMap[rawMatch.awayTeam.name] || 10,
        homeForm: 0.5,
        awayForm: 0.5
    };
}

function analyzeVFLDNA(matches) {
    console.log(`[Analyzer] Analyzing DNA for ${matches.length} matches...`);
    let totalHomeGoals = 0, totalAwayGoals = 0, homeWins = 0, draws = 0, awayWins = 0, btts = 0, over25 = 0;

    matches.forEach(m => {
        totalHomeGoals += m.homeGoals;
        totalAwayGoals += m.awayGoals;
        if (m.homeGoals > m.awayGoals) homeWins++;
        else if (m.homeGoals === m.awayGoals) draws++;
        else awayWins++;
        if (m.homeGoals >= 1 && m.awayGoals >= 1) btts++;
        if (m.homeGoals + m.awayGoals > 2.5) over25++;
    });

    const stats = {
        avgHomeGoals: totalHomeGoals / matches.length,
        avgAwayGoals: totalAwayGoals / matches.length,
        homeWinRate: homeWins / matches.length,
        drawRate: draws / matches.length,
        awayWinRate: awayWins / matches.length,
        bttsRate: btts / matches.length,
        over25Rate: over25 / matches.length
    };
    console.log('[Analyzer] Results:', stats);
    return stats;
}

function calculateBrier(prob, actual) {
    return Math.pow(prob - (actual ? 1 : 0), 2);
}

async function optimizeWeights(matches) {
    console.log(`[Optimizer] Optimizing weights for ${matches.length} matches...`);

    // Split Train/Validation (80/20)
    const splitIdx = Math.floor(matches.length * 0.8);
    const trainSet = matches.slice(0, splitIdx);
    const valSet = matches.slice(splitIdx);

    const baseRates = [0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0];
    const weightsRange = [0.1, 0.3, 0.5, 0.7, 0.9];

    let bestTrainScore = Infinity;
    let bestParams = {};

    // To avoid modifying the real HeuristicEngine's state or using real DB weights,
    // we'll implement a local simulation of the predict logic.

    for (const br of baseRates) {
        for (const wr of weightsRange) {
            for (const wf of weightsRange) {
                for (const wb of weightsRange) {
                    let totalBrier = 0;

                    for (const m of trainSet) {
                        // Simulate lambda calculation
                        const homeRankDiff = (m.awayRank - m.homeRank) / 20;
                        const awayRankDiff = (m.homeRank - m.awayRank) / 20;
                        const homeFormDiff = (m.homeForm - m.awayForm + 1) / 2;
                        const awayFormDiff = (m.awayForm - m.homeForm + 1) / 2;

                        const hLambda = Math.max(0.1, br + (wr * homeRankDiff) + (wf * homeFormDiff) + (wb * 1.0));
                        const aLambda = Math.max(0.1, br + (wr * awayRankDiff) + (wf * awayFormDiff));

                        // Simplified probability for outcome '1' (Home Win)
                        // In real engine it uses Poisson Matrix. We'll use a simplified approach for speed:
                        // P(Home Win) is roughly proportional to (hLambda / (hLambda + aLambda))
                        const prob1 = hLambda / (hLambda + aLambda);
                        const actual1 = m.homeGoals > m.awayGoals ? 1 : 0;
                        totalBrier += calculateBrier(prob1, actual1);
                    }

                    const avgBrier = totalBrier / trainSet.length;
                    if (avgBrier < bestTrainScore) {
                        bestTrainScore = avgBrier;
                        bestParams = { baseRate: br, outcome_ranking: wr, outcome_form: wf, outcome_bias: wb };
                    }
                }
            }
        }
    }

    // Verify on Validation Set
    let valBrier = 0;
    for (const m of valSet) {
        const hLambda = Math.max(0.1, bestParams.baseRate + (bestParams.outcome_ranking * ((m.awayRank - m.homeRank) / 20)) + (bestParams.outcome_form * ((m.homeForm - m.awayForm + 1) / 2)) + (bestParams.outcome_bias * 1.0));
        const aLambda = Math.max(0.1, bestParams.baseRate + (bestParams.outcome_ranking * ((m.homeRank - m.awayRank) / 20)) + (bestParams.outcome_form * ((m.awayForm - m.homeForm + 1) / 2)));
        const prob1 = hLambda / (hLambda + aLambda);
        const actual1 = m.homeGoals > m.awayGoals ? 1 : 0;
        valBrier += calculateBrier(prob1, actual1);
    }

    console.log(`[Optimizer] Best Train Brier: ${bestTrainScore.toFixed(4)}`);
    console.log(`[Optimizer] Best Val Brier: ${(valBrier / valSet.length).toFixed(4)}`);
    console.log(`[Optimizer] Recommended Params:`, bestParams);

    return bestParams;
}

function generateReport(dna, params) {
    console.log(`
============================================================
🌟 VFL DISCOVERY REPORT 🌟
============================================================

📊 SIMULATOR DNA ANALYSIS
------------------------------------------------------------
Average Home Goals: ${dna.avgHomeGoals.toFixed(3)}
Average Away Goals: ${dna.avgAwayGoals.toFixed(3)}
Total Average Goals: ${(dna.avgHomeGoals + dna.avgAwayGoals).toFixed(3)}

Home Win Rate:  ${(dna.homeWinRate * 100).toFixed(2)}%
Draw Rate:      ${(dna.drawRate * 100).toFixed(2)}%
Away Win Rate:  ${(dna.awayWinRate * 100).toFixed(2)}%

BTTS Rate:      ${(dna.bttsRate * 100).toFixed(2)}%
Over 2.5 Rate:  ${(dna.over25Rate * 100).toFixed(2)}%

------------------------------------------------------------
🚀 RECOMMENDED ENGINE SETTINGS
------------------------------------------------------------
Base Rate (λ):     ${params.baseRate}
Ranking Weight:    ${params.outcome_ranking}
Form Weight:       ${params.outcome_form}
Home Bias Weight:  ${params.outcome_bias}

💡 Application Advice:
Update your settings.js or WeightManager to these values
to maximize prediction accuracy based on historical data.
============================================================
    `);
}

async function main() {
    console.log('Starting VFL Discovery Process...');
    try {
        const rankingData = await formService.getRanking();
        const rankingMap = {};
        if (rankingData && Array.isArray(rankingData.teams)) {
            rankingData.teams.forEach(t => {
                rankingMap[t.name] = t.position;
            });
        }

        const rawMatches = await collectAllResults(settings.LEAGUE_ID);
        const normalized = rawMatches.map(m => normalizeMatchData(m, rankingMap));

        const dna = analyzeVFLDNA(normalized);
        const params = await optimizeWeights(normalized);

        generateReport(dna, params);
    } catch (err) {
        console.error('[Fatal Error] Discovery process failed:', err);
    }
}

if (require.main === module) {
    main();
}

module.exports = { collectAllResults, normalizeMatchData };
