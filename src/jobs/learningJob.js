const learningLoop = require('../services/predictor/LearningLoop');
const learningService = require('../services/healing/LearningService');
const sportyClient = require('../api/sportyClient');
const settings = require('../config/settings');
const predictor = require('../services/predictor/HeuristicEngine');
const formService = require('../services/predictor/FormService');


async function runLearningJob() {
    console.log('[LearningJob] Starting learning cycle...');
    try {
        // 1. Get recent results
        const resultsData = await sportyClient.getResults(settings.LEAGUE_ID, 0, 20);
        const rounds = resultsData.rounds || [];

        for (const round of rounds) {
            if (!round || !Array.isArray(round.matches)) continue;
            for (const match of round.matches) {
                // Only learn from completed matches that have a score
                if (match.score && match.score.includes(':')) {
                    const actualOutcome = _parseScoreToOutcome(match.score);

                    // Reconstruct the match object for the predictor
                    const homeForm = await formService.getTeamForm(match.homeTeam.name);
                    const awayForm = await formService.getTeamForm(match.awayTeam.name);

                    let odds = { home: 2.0, draw: 3.0, away: 3.0, bttsYes: 2.0, ouOver: 2.0 };
                    if (match.eventBetTypes) {
                        match.eventBetTypes.forEach(bet => {
                            if (bet.name === '1X2' && bet.eventBetTypeItems) {
                                bet.eventBetTypeItems.forEach(item => {
                                    if (item.shortName === '1') odds.home = item.odds;
                                    else if (item.shortName === 'X') odds.draw = item.odds;
                                    else if (item.shortName === '2') odds.away = item.odds;
                                });
                            } else if (bet.name === 'BTTS' && bet.eventBetTypeItems) {
                                const yes = bet.eventBetTypeItems.find(item => item.shortName === 'Yes');
                                if (yes) odds.bttsYes = yes.odds;
                            } else if (bet.name === 'Over/Under 2.5' && bet.eventBetTypeItems) {
                                const over = bet.eventBetTypeItems.find(item => item.shortName === 'Over');
                                if (over) odds.ouOver = over.odds;
                            }
                        });
                    }

                    const predictorMatch = {
                        homeTeam: { name: match.homeTeam.name, ranking: match.homeTeam.position, form: homeForm },
                        awayTeam: { name: match.awayTeam.name, ranking: match.awayTeam.position, form: awayForm },
                        odds: odds
                    };

                    // Generate real prediction
                    const pred = await predictor.predict(predictorMatch);

                    // Behavioral Learning: Update DNA, Momentum, and Kryptonite
                    const [homeScore, awayScore] = match.score.split(':').map(Number);
                    await learningService.processMatchResult({
                        homeTeam: match.homeTeam.name,
                        awayTeam: match.awayTeam.name,
                        homeScore,
                        awayScore,
                        homeRank: match.homeTeam.position,
                        awayRank: match.awayTeam.position
                    });

                    // Learn from Outcome with actual goals for Lambda-based learning
                    await learningLoop.adjustWeights(pred, actualOutcome, pred.factors, 'outcome', pred.outcomeConf, { home: homeScore, away: awayScore });


                    // In a real system, we'd also have actuals for BTTS and OU
                    // For now, we simulate those actuals based on the score to test the loop
                    const actualBTTS = (match.score.split(':').every(s => s !== '0')) ? 'Yes' : 'No';
                    const actualOU = (match.score.split(':').reduce((a, b) => a + Number(b), 0) > 2.5) ? 'Over' : 'Under';

                    await learningLoop.adjustWeights(pred.btts, actualBTTS, pred.factors, 'btts', pred.bttsConf);
                    await learningLoop.adjustWeights(pred.ou, actualOU, pred.factors, 'ou', pred.ouConf);
                }
            }
        }
        console.log('[LearningJob] Learning cycle completed successfully.');
    } catch (err) {
        console.error('[LearningJob] Error during learning cycle:', err);
    }
}

function _parseScoreToOutcome(score) {
    const [home, away] = score.split(':').map(Number);
    if (home > away) return '1';
    if (home < away) return '2';
    return 'X';
}

module.exports = { runLearningJob };
