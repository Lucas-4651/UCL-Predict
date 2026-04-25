const sportyClient = require('./src/api/sportyClient');
const settings = require('./src/config/settings');
const fs = require('fs');
const storage = require('./sqlite_storage');

async function analyzeGame() {
    const leagueId = settings.LEAGUE_ID;
    console.log(`Starting ULTIMATE LEAGUE INTELLIGENCE analysis for League ${leagueId}...`);

    try {
        await storage.init();

        // PHASE 1: INGESTION (API -> SQLite)
        console.log('\n--- Phase 1: Ingesting results from API ---');
        let totalFetched = 0;
        let newMatchesAdded = 0;
        let skip = 0;
        const take = 50;
        let keepFetching = true;

        while (keepFetching) {
            const data = await sportyClient.getResults(leagueId, skip, take);
            if (!data || !data.rounds || data.rounds.length === 0) {
                keepFetching = false;
                break;
            }

            // Anti-block delay: wait 1 second between batches to simulate human behavior
            await new Promise(resolve => setTimeout(resolve, 1000));

            let matchesInThisBatch = 0;
            for (const round of data.rounds) {
                for (const match of round.matches) {
                    matchesInThisBatch++;
                    const season = settings.CURRENT_SEASON;
                    const externalId = `${season}_${round.roundNumber}_${match.homeTeam.name}_${match.awayTeam.name}`;
                    const matchData = {
                        externalId,
                        season,
                        homeTeam: match.homeTeam.name,
                        awayTeam: match.awayTeam.name,
                        homeGoals: parseInt(match.score.split(':')[0]),
                        awayGoals: parseInt(match.score.split(':')[1]),
                        goals: match.goals || [],
                        round: round.roundNumber
                    };
                    const id = await storage.saveMatch(matchData);
                    if (id) newMatchesAdded++;
                }
            }
            totalFetched += matchesInThisBatch;
            if (matchesInThisBatch < take) keepFetching = false;
            else skip += take;
            if (skip > 2000) keepFetching = false;
        }
        console.log(`Ingestion complete. Fetched ${totalFetched} matches, added ${newMatchesAdded} new matches.`);

        // PHASE 2: AGGREGATION (SQLite -> Stats & Matchups)
        console.log('\n--- Phase 2: Aggregating All-Team & Matchup Data ---');
        const allMatches = await storage.getAllMatches();
        const teamStats = {};
        const matchupStats = {};

        allMatches.forEach(match => {
            const homeName = match.home_team;
            const awayName = match.away_team;
            const homeGoals = match.home_goals;
            const awayGoals = match.away_goals;
            const totalGoals = homeGoals + awayGoals;
            const goals = JSON.parse(match.goals_json || '[]');

            // 1. General Team Stats
            const initTeam = () => ({
                matches: 0,
                home: { played: 0, won: 0, draw: 0, lost: 0, scored: 0, conceded: 0 },
                away: { played: 0, won: 0, draw: 0, lost: 0, scored: 0, conceded: 0 },
                btts: 0,
                over25: 0,
                cleanSheets: 0,
                failedToScore: 0,
                scoringMinutes: []
            });

            if (!teamStats[homeName]) teamStats[homeName] = initTeam();
            if (!teamStats[awayName]) teamStats[awayName] = initTeam();

            teamStats[homeName].matches++;
            teamStats[homeName].home.played++;
            teamStats[homeName].home.scored += homeGoals;
            teamStats[homeName].home.conceded += awayGoals;
            if (homeGoals > awayGoals) teamStats[homeName].home.won++;
            else if (homeGoals === awayGoals) teamStats[homeName].home.draw++;
            else teamStats[homeName].home.lost++;

            teamStats[awayName].matches++;
            teamStats[awayName].away.played++;
            teamStats[awayName].away.scored += awayGoals;
            teamStats[awayName].away.conceded += homeGoals;
            if (awayGoals > homeGoals) teamStats[awayName].away.won++;
            else if (awayGoals === homeGoals) teamStats[awayName].away.draw++;
            else teamStats[awayName].away.lost++;

            if (homeGoals > 0 && awayGoals > 0) {
                teamStats[homeName].btts++;
                teamStats[awayName].btts++;
            }
            if (totalGoals > 2.5) {
                teamStats[homeName].over25++;
                teamStats[awayName].over25++;
            }
            if (awayGoals === 0) teamStats[homeName].cleanSheets++;
            if (homeGoals === 0) teamStats[awayName].cleanSheets++;
            if (homeGoals === 0) teamStats[homeName].failedToScore++;
            if (awayGoals === 0) teamStats[awayName].failedToScore++;

            goals.forEach(g => {
                const team = g.team === 'Home' ? homeName : awayName;
                teamStats[team].scoringMinutes.push(g.minute);
            });

            // 2. Matchup-Specific Stats (Symmetric Key)
            const pair = [homeName, awayName].sort();
            const pairKey = `${pair[0]}_vs_${pair[1]}`;
            if (!matchupStats[pairKey]) {
                matchupStats[pairKey] = {
                    matches: 0,
                    homeWins: 0, awayWins: 0, draws: 0,
                    totalGoals: 0, btts: 0, over25: 0,
                    scores: []
                };
            }
            const mS = matchupStats[pairKey];
            mS.matches++;
            if (homeGoals > awayGoals) mS.homeWins++;
            else if (awayGoals > homeGoals) mS.awayWins++;
            else mS.draws++;
            mS.totalGoals += totalGoals;
            if (homeGoals > 0 && awayGoals > 0) mS.btts++;
            if (totalGoals > 2.5) mS.over25++;
            mS.scores.push(`${homeGoals}:${awayGoals}`);
        });

        // PHASE 3: ANALYSIS GENERATION
        console.log('\n--- Phase 3: Generating Full Intelligence Matrix ---');
        const finalAnalysis = {
            teams: {},
            matchups: {}
        };

        // Process all teams
        for (const [name, stats] of Object.entries(teamStats)) {
            const homeWinRate = stats.home.won / (stats.home.played || 1);
            const awayWinRate = stats.away.won / (stats.away.played || 1);
            const avgScored = (stats.home.scored + stats.away.scored) / (stats.matches || 1);
            const avgConceded = (stats.home.conceded + stats.away.conceded) / (stats.matches || 1);
            const homeAvgScored = stats.home.scored / (stats.home.played || 1);
            const awayAvgScored = stats.away.scored / (stats.away.played || 1);
            const homeAvgConceded = stats.home.conceded / (stats.home.played || 1);
            const awayAvgConceded = stats.away.conceded / (stats.away.played || 1);

            finalAnalysis.teams[name] = {
                profile: {
                    totalMatches: stats.matches,
                    winRateHome: (homeWinRate * 100).toFixed(2) + '%',
                    winRateAway: (awayWinRate * 100).toFixed(2) + '%',
                    avgScored: avgScored.toFixed(2),
                    avgConceded: avgConceded.toFixed(2),
                    homeAvgScored: homeAvgScored.toFixed(2),
                    awayAvgScored: awayAvgScored.toFixed(2),
                    homeAvgConceded: homeAvgConceded.toFixed(2),
                    awayAvgConceded: awayAvgConceded.toFixed(2),
                    bttsProbability: ((stats.btts / stats.matches) * 100).toFixed(2) + '%',
                    over25Probability: ((stats.over25 / stats.matches) * 100).toFixed(2) + '%',
                    cleanSheetRate: ((stats.cleanSheets / stats.matches) * 100).toFixed(2) + '%',
                    failedToScoreRate: ((stats.failedToScore / stats.matches) * 100).toFixed(2) + '%',
                },
                dna: {
                    offensiveReliability: calculateReliability(stats),
                    defensiveReliability: calculateDefensiveReliability(stats),
                    scoringDistribution: analyzeDetailedScoring(stats.scoringMinutes),
                    homeAdvantage: (homeWinRate - awayWinRate).toFixed(2),
                    volatility: calculateVolatility(stats.home.scored + stats.away.scored, stats.home.conceded + stats.away.conceded, stats.matches),
                    halfTimeTendency: analyzeHalfTime(stats.scoringMinutes)
                }
            };
        }

        // Process all matchups
        for (const [pairKey, stats] of Object.entries(matchupStats)) {
            finalAnalysis.matchups[pairKey] = {
                totalMatches: stats.matches,
                winProbHome: ((stats.homeWins / stats.matches) * 100).toFixed(2) + '%',
                winProbAway: ((stats.awayWins / stats.matches) * 100).toFixed(2) + '%',
                drawProb: ((stats.draws / stats.matches) * 100).toFixed(2) + '%',
                avgGoals: (stats.totalGoals / stats.matches).toFixed(2),
                bttsProbability: ((stats.btts / stats.matches) * 100).toFixed(2) + '%',
                over25Probability: ((stats.over25 / stats.matches) * 100).toFixed(2) + '%',
                mostCommonScore: getMostCommon(stats.scores)
            };
        }

        // PHASE 4: ANOMALY & SURPRISE DETECTION
        console.log('\n--- Phase 4: Analyzing Strategic Surprise Windows & Season Tweaks ---');
        const surprises = detectSurprises(allMatches, finalAnalysis.teams);
        finalAnalysis.surprises = surprises;
        finalAnalysis.upsetPatterns = analyzeUpsetPatterns(surprises);
        finalAnalysis.seasonalTrends = analyzeSeasonalTrends(surprises);
        finalAnalysis.rankingGaps = analyzeRankingGaps(surprises);
        finalAnalysis.seasonTweaks = analyzeSeasonTweaks(allMatches, finalAnalysis.teams);

        fs.writeFileSync('game_behavior_analysis.json', JSON.stringify(finalAnalysis, null, 2));
        console.log('\nUltimate Intelligence Analysis saved to game_behavior_analysis.json');
        printFullReport(finalAnalysis);

    } catch (error) {
        console.error('Analysis failed:', error.message);
    } finally {
        await storage.close();
    }
}

function calculateReliability(stats) {
    const scoreRate = (stats.home.scored + stats.away.scored) / (stats.matches || 1);
    if (scoreRate > 2) return 'High Offensive';
    if (scoreRate < 0.8) return 'Low Offensive';
    return 'Balanced';
}

function calculateDefensiveReliability(stats) {
    const concededRate = (stats.home.conceded + stats.away.conceded) / (stats.matches || 1);
    const csRate = stats.cleanSheets / (stats.matches || 1);
    if (concededRate < 0.8 || csRate > 0.4) return 'Iron Wall';
    if (concededRate > 2) return 'Leaky Defense';
    return 'Standard';
}

function calculateVolatility(scored, conceded, matches) {
    if (matches === 0) return 'N/A';
    const ratio = scored / (conceded || 1);
    return (ratio > 2 || ratio < 0.5) ? 'High Volatility' : 'Stable';
}

function analyzeDetailedScoring(minutes) {
    if (minutes.length === 0) return { peakPeriod: 'No data', distribution: {} };
    const bins = { '0-15': 0, '16-30': 0, '31-45': 0, '46-60': 0, '61-75': 0, '76-90': 0 };
    minutes.forEach(m => {
        if (m <= 15) bins['0-15']++; else if (m <= 30) bins['16-30']++; else if (m <= 45) bins['31-45']++;
        else if (m <= 60) bins['46-60']++; else if (m <= 75) bins['61-75']++; else bins['76-90']++;
    });
    const sorted = Object.entries(bins).sort((a, b) => b[1] - a[1]);
    return { peakPeriod: sorted[0][0], distribution: bins };
}

function getMostCommon(arr) {
    if (arr.length === 0) return 'N/A';
    const counts = {};
    arr.forEach(x => counts[x] = (counts[x] || 0) + 1);
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function analyzeHalfTime(minutes) {
    if (!minutes || minutes.length === 0) return 'No data';
    const firstHalf = minutes.filter(m => m <= 45).length;
    const secondHalf = minutes.filter(m => m > 45).length;
    const ratio = firstHalf / (minutes.length || 1);
    if (ratio > 0.6) return 'Early Dominator';
    if (ratio < 0.4) return 'Late Finisher';
    return 'Balanced';
}

function detectSurprises(matches, teamProfiles) {
    const surprises = [];
    matches.forEach(match => {
        const home = match.home_team;
        const away = match.away_team;
        const homeGoals = match.home_goals;
        const awayGoals = match.away_goals;
        const goals = JSON.parse(match.goals_json || '[]');
        const round = match.round;

        const homeProfile = teamProfiles[home]?.profile;
        const awayProfile = teamProfiles[away]?.profile;

        if (!homeProfile || !awayProfile) return;

        const homeWR = parseFloat(homeProfile.winRateHome);
        const awayWR = parseFloat(awayProfile.winRateAway);

        let isUpset = false;
        let winner = null;
        let loser = null;
        let winnerWR = 0;
        let loserWR = 0;

        if (homeGoals > awayGoals && homeWR < 30 && awayWR > 60) {
            isUpset = true;
            winner = home;
            loser = away;
            winnerWR = homeWR;
            loserWR = awayWR;
        } else if (awayGoals > homeGoals && awayWR < 30 && homeWR > 60) {
            isUpset = true;
            winner = away;
            loser = home;
            winnerWR = awayWR;
            loserWR = homeWR;
        }

        if (isUpset) {
            const totalGoals = homeGoals + awayGoals;
            const first15Mins = goals.filter(g => g.minute <= 15).length;
            const last15Mins = goals.filter(g => g.minute >= 75).length;

            let winningFormula = 'Unknown';
            if (totalGoals <= 2 && (homeGoals === 1 || awayGoals === 1)) winningFormula = 'Defensive Masterclass (Low Block)';
            else if (first15Mins > 0) winningFormula = 'Shock Start (Early Goal)';
            else if (last15Mins > 0) winningFormula = 'Endurance/Psychological Collapse';
            else winningFormula = 'Tactical Outplay';

            surprises.push({
                match: `${home} vs ${away}`,
                round,
                winner,
                loser,
                score: `${homeGoals}:${awayGoals}`,
                formula: winningFormula,
                wrGap: Math.abs(loserWR - winnerWR),
                details: {
                    winnerWR,
                    loserWR,
                    totalGoals,
                    first15Mins,
                    last15Mins
                }
            });
        }
    });
    return surprises;
}

function analyzeSeasonalTrends(surprises) {
    if (surprises.length === 0) return { trend: 'No data' };

    const rounds = surprises.map(s => s.round);
    const minRound = Math.min(...rounds);
    const maxRound = Math.max(...rounds);

    // Split season into 3 phases: Start, Mid, End
    const midPoint = (maxRound - minRound) / 2;
    let startCount = 0, midCount = 0, endCount = 0;

    surprises.forEach(s => {
        if (s.round <= minRound + midPoint / 2) startCount++;
        else if (s.round <= minRound + (midPoint * 1.5)) midCount++;
        else endCount++;
    });

    const total = surprises.length;
    return {
        startPhaseProb: ((startCount / total) * 100).toFixed(2) + '%',
        midPhaseProb: ((midCount / total) * 100).toFixed(2) + '%',
        endPhaseProb: ((endCount / total) * 100).toFixed(2) + '%',
        peakPhase: startCount > midCount && startCount > endCount ? 'Start of Season' :
                   midCount > startCount && midCount > endCount ? 'Mid Season' : 'End of Season'
    };
}

function analyzeRankingGaps(surprises) {
    if (surprises.length === 0) return { gapTrend: 'No data' };

    const gaps = surprises.map(s => s.wrGap);
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;

    return {
        averageSurpriseGap: avgGap.toFixed(2) + '%',
        dangerZone: `When the level gap is around ${avgGap.toFixed(2)}%`,
        maxGapObserved: Math.max(...gaps).toFixed(2) + '%'
    };
}

function analyzeSeasonTweaks(allMatches, teamProfiles) {
    const currentSeason = settings.CURRENT_SEASON;
    const tweaks = [];

    for (const [name, profile] of Object.entries(teamProfiles)) {
        const currentSeasonMatches = allMatches.filter(m => m.season === currentSeason && (m.home_team === name || m.away_team === name));
        if (currentSeasonMatches.length === 0) continue;

        // Calculate current season win rate
        let currentWins = 0;
        currentSeasonMatches.forEach(m => {
            if (m.home_team === name && m.home_goals > m.away_goals) currentWins++;
            if (m.away_team === name && m.away_goals > m.home_goals) currentWins++;
        });
        const currentWR = (currentWins / currentSeasonMatches.length) * 100;
        const overallWR = parseFloat(profile.profile.winRateHome); // Use Home WR as proxy for overall strength

        const diff = currentWR - overallWR;
        if (Math.abs(diff) > 15) {
            tweaks.push({
                team: name,
                overallWR: overallWR.toFixed(2) + '%',
                currentWR: currentWR.toFixed(2) + '%',
                delta: diff.toFixed(2) + '%',
                type: diff > 0 ? 'Upgraded' : 'Degraded'
            });
        }
    }
    return tweaks;
}

function analyzeUpsetPatterns(surprises) {
    if (surprises.length === 0) return { generalTrend: 'No significant upsets detected', formulaStats: {} };

    const formulaCounts = {};
    const kryptonite = {};

    surprises.forEach(s => {
        // Formula distribution
        formulaCounts[s.formula] = (formulaCounts[s.formula] || 0) + 1;

        // Kryptonite detection: does the same underdog beat the same giant multiple times?
        const key = `${s.winner} -> ${s.loser}`;
        kryptonite[key] = (kryptonite[key] || 0) + 1;
    });

    return {
        totalUpsets: surprises.length,
        dominantFormula: Object.entries(formulaCounts).sort((a, b) => b[1] - a[1])[0][0],
        formulaDistribution: formulaCounts,
        kryptoniteMatches: Object.entries(kryptonite).filter(([k, v]) => v > 1).map(([k, v]) => `${k} (${v} times)`)
    };
}

function printFullReport(analysis) {
    console.log('\n--- FULL LEAGUE PROFILES (All 36 Teams) ---');
    const allTeams = Object.entries(analysis.teams)
        .sort((a, b) => parseFloat(b[1].profile.winRateHome) - parseFloat(a[1].profile.winRateHome));

    console.log('Team Name | WinHome | WinAway | HomeAvgS | AwayAvgS | DNA (Off/Def) | Peak | Tendency');
    console.log('------------------------------------------------------------------------------------------------------------------');
    allTeams.forEach(([name, data]) => {
        console.log(`${name.padEnd(18)} | ${data.profile.winRateHome.padStart(8)} | ${data.profile.winRateAway.padStart(8)} | ${data.profile.homeAvgScored.padStart(9)} | ${data.profile.awayAvgScored.padStart(9)} | ${data.dna.offensiveReliability.padEnd(15)}/${data.dna.defensiveReliability.padEnd(15)} | ${data.dna.scoringDistribution.peakPeriod.padEnd(5)} | ${data.dna.halfTimeTendency}`);
    });

    if (analysis.surprises && analysis.surprises.length > 0) {
        console.log('\n--- ⚡ STRATEGIC SURPRISE ANALYSIS (Seasonal & Structural) ---');
        console.log(`Total Upsets: ${analysis.upsetPatterns.totalUpsets}`);

        console.log('\n📅 SEASONAL WINDOWS (When in the season):');
        console.log(`- Start Phase: ${analysis.seasonalTrends.startPhaseProb}`);
        console.log(`- Mid Phase: ${analysis.seasonalTrends.midPhaseProb}`);
        console.log(`- End Phase: ${analysis.seasonalTrends.endPhaseProb}`);
        console.log(`- Peak Surprise Window: ${analysis.seasonalTrends.peakPhase}`);

        console.log('\n📊 RANKING DANGER ZONE (Level gap):');
        console.log(`- Average Gap for Upsets: ${analysis.rankingGaps.averageSurpriseGap}`);
        console.log(`- Critical Danger Zone: ${analysis.rankingGaps.dangerZone}`);
        console.log(`- Max Gap Overcome: ${analysis.rankingGaps.maxGapObserved}`);

        console.log('\n🛠️ WINNING FORMULAS:');
        console.log(`- Dominant Formula: ${analysis.upsetPatterns.dominantFormula}`);

        console.log('\nDetailed Upset Breakdown:');
        analysis.surprises.forEach(s => {
            console.log(`- Round ${s.round} | ${s.match} (${s.score}) | Formula: ${s.formula} | Gap: ${s.wrGap.toFixed(2)}%`);
        });

        if (analysis.upsetPatterns.kryptoniteMatches.length > 0) {
            console.log('\n💀 KRYPTONITE EFFECT:');
            analysis.upsetPatterns.kryptoniteMatches.forEach(k => console.log(`- ${k}`));
        }

        if (analysis.seasonTweaks && analysis.seasonTweaks.length > 0) {
            console.log('\n🔄 SEASON TWEAKS (Behavioral shifts):');
            analysis.seasonTweaks.forEach(t => {
                console.log(`- ${t.team}: ${t.type} (${t.overallWR} -> ${t.currentWR}) Delta: ${t.delta}`);
            });
        }
    } else {
        console.log('\n--- ⚡ SURPRISE FACTOR: No significant upsets detected (League is predictable) ---');
    }
}

analyzeGame();
