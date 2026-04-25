const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/authMiddleware');
const predictor = require('../services/predictor/HeuristicEngine');
const sportyClient = require('../api/sportyClient');
const formService = require('../services/predictor/FormService');
const settings = require('../config/settings');
const healthMonitor = require('../services/healing/HealthMonitor');
const dbService = require('../services/dbService');
const learningLoop = require('../services/predictor/LearningLoop');
const chatService = require('../services/chatService');
const db = require('../config/database');

router.get('/', async (req, res) => {
    try {
        res.render('index', { league: settings.LEAGUE_NAME, systemState: healthMonitor.getState() });
    } catch (err) {
        res.status(500).send(`Error: ${err.message}`);
    }
});

router.get('/download', async (req, res) => {
    try {
        res.render('download', { league: settings.LEAGUE_NAME, systemState: healthMonitor.getState() });
    } catch (err) {
        res.status(500).send(`Error: ${err.message}`);
    }
});

router.get('/predictions', isAuthenticated, async (req, res) => {
    try {
        const { predictions, systemState } = await getPredictionsData();
        res.render('predictions', { predictions, league: settings.LEAGUE_NAME, systemState });
    } catch (err) {
        res.status(500).send(`Error: ${err.message}`);
    }
});

router.get('/predictions/api', isAuthenticated, async (req, res) => {
    try {
        const { predictions, systemState } = await getPredictionsData();
        res.json({ predictions, systemState });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

async function getPredictionsData() {
    const matchesData = await sportyClient.getMatches(settings.LEAGUE_ID);
    const rounds = matchesData.rounds || [];

    const allMatches = rounds.flatMap(round =>
        (round && Array.isArray(round.matches)) ? round.matches : []
    ).filter(match => match && match.homeTeam && match.awayTeam);

    const rankingData = await formService.getRanking();
    const rankingMap = {};
    if (rankingData && Array.isArray(rankingData.teams)) {
        rankingData.teams.forEach(t => {
            rankingMap[t.name] = t.position;
        });
    }

    const predictionPromises = allMatches.map(async (match) => {
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
                homeTeam: {
                    name: match.homeTeam.name,
                    ranking: rankingMap[match.homeTeam.name] ?? match.homeTeam.position,
                    form: homeForm
                },
                awayTeam: {
                    name: match.awayTeam.name,
                    ranking: rankingMap[match.awayTeam.name] ?? match.awayTeam.position,
                    form: awayForm
                },
                odds: odds
            };
            const pred = await predictor.predict(predictorMatch);

            await dbService.savePrediction({
                match_id: match.id || `${match.homeTeam.name}-${match.awayTeam.name}-${Date.now()}`,
                home_team: match.homeTeam.name,
                away_team: match.awayTeam.name,
                predicted_outcome: pred.outcome,
                confidence: pred.outcomeConf,
                lambda_home: pred.lambda_home,
                lambda_away: pred.lambda_away,
                prob_matrix: pred.matrix,
                predicted_probs: pred.probabilities
            }).catch(err => console.error('Logging failure:', err));

        return {
            match: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
            odds: odds,
            ...pred,
            outcomeName: pred.outcome === '1' ? match.homeTeam.name :
                         pred.outcome === '2' ? match.awayTeam.name : 'Nul'
        };
    });

    const predictions = await Promise.all(predictionPromises);
    return { predictions, systemState: healthMonitor.getState() };
}

router.post('/update-result', isAuthenticated, async (req, res) => {
    try {
        const { match_id, home_goals, away_goals } = req.body;
        if (match_id === undefined || home_goals === undefined || away_goals === undefined) {
            return res.status(400).send('Missing match_id, home_goals, or away_goals');
        }

        const pred = await dbService.getPrediction(match_id);
        if (!pred) return res.status(404).send('Prediction not found');

        // 1. Calculate actual outcome
        let actualOutcome = 'X';
        if (home_goals > away_goals) actualOutcome = '1';
        else if (away_goals > home_goals) actualOutcome = '2';

        // 2. Calculate Brier Score for outcome
        const probs = JSON.parse(pred.predicted_probs);
        const probActual = probs.outcome[actualOutcome];
        const brierScore = learningLoop.calculateBrierScore(probActual, true); // simplified for this route

        // 3. Update Weights
        // We need the factors that were used. Since we don't store factors, we re-calculate them.
        // Note: In a real system, we should store the factors used for each prediction.
        // For now, we'll use current weights as a proxy or a simplified factor set.
        const factors = {
            outcome_ranking: 0.5, outcome_form: 0.5, outcome_bias: 0.5,
            btts_form: 0.5, ou_form: 0.5
        };

        await learningLoop.adjustWeights(
            { lambdas: { home: pred.lambda_home, away: pred.lambda_away } },
            actualOutcome,
            factors,
            'outcome',
            brierScore,
            { home: home_goals, away: away_goals }
        );

        // 4. Update DB
        const isCorrect = pred.predicted_outcome === actualOutcome ? 1 : 0;
        await dbService.updatePredictionResult(pred.id, actualOutcome, home_goals, away_goals, isCorrect, brierScore);

        res.send(`Result updated. Brier Score: ${brierScore.toFixed(4)}, Outcome: ${actualOutcome}`);
    } catch (err) {
        res.status(500).send(`Error updating result: ${err.message}`);
    }
});

// Chat API
router.get('/api/chat/messages', async (req, res) => {
    try {
        const messages = await chatService.getRecentMessages();
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/api/chat/react', isAuthenticated, async (req, res) => {
    try {
        const { messageId, reaction } = req.body;
        if (!messageId || !reaction) {
            return res.status(400).json({ error: 'messageId and reaction are required' });
        }

        const userId = req.session.user.id;

        // Check if reaction already exists to toggle it
        const existing = await db.query(
            'SELECT id FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND reaction = $3',
            [messageId, userId, reaction]
        );

        if (existing.rows.length > 0) {
            await chatService.removeReaction(messageId, userId, reaction);
            res.json({ action: 'removed', messageId, reaction });
        } else {
            await chatService.addReaction(messageId, userId, reaction);
            res.json({ action: 'added', messageId, reaction });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/api/chat/send', isAuthenticated, async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) return res.status(400).json({ error: 'Message content is required' });

        const message = await chatService.sendMessage(req.session.user.id, content, 'chat');
        res.json(message);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
