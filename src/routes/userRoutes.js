const express = require('express');
const router = express.Router();
const { isAuthenticated, isChatAuthenticated } = require('../middleware/authMiddleware');
const predictor = require('../services/predictor/HeuristicEngine');
const sportyClient = require('../api/sportyClient');
const formService = require('../services/predictor/FormService');
const settings = require('../config/settings');
const healthMonitor = require('../services/healing/HealthMonitor');
const dbService = require('../services/dbService');
const learningLoop = require('../services/predictor/LearningLoop');
const cacheService = require('../services/predictor/CachePredictionService');
const chatService = require('../services/chatService');
const realtimeService = require('../services/realtimeService');
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
        res.render('predictions', {
            predictions,
            league: settings.LEAGUE_NAME,
            systemState,
            currentUser: req.session.user || null
        });
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

// Serves pre-computed predictions for a specific round from prediction_cache.
// Falls back to live computation if the round is not (yet) cached OR if the
// cache read fails (e.g. Neon is momentarily unreachable). The DB read is NOT
// wrapped in a .catch upstream, so a transient connection error would otherwise
// bubble up as a 500 and trigger the client refresh alert — we degrade
// gracefully to the live path instead, which only needs the Sporty API.
router.get('/predictions/api/round/:n', isAuthenticated, async (req, res) => {
    try {
        const roundNumber = Number(req.params.n);
        let cached = null;
        try {
            cached = await cacheService.getCachedRound(roundNumber);
        } catch (cacheErr) {
            console.error('⚠️ Cache read failed (falling back to live):', cacheErr.message);
        }
        if (cached) {
            return res.json({ predictions: cached.predictions, systemState: healthMonitor.getState(), fromCache: true });
        }
        const { predictions, systemState } = await getPredictionsData();
        res.json({ predictions, systemState, fromCache: false });
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

    const predictions = await cacheService.computePredictionsForMatches(allMatches);
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

router.get('/api/chat/stream', async (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
    });

    const identity = req.session && req.session.user
        ? { userId: req.session.user.id, username: req.session.user.username }
        : (req.session && req.session.adminId
            ? { userId: req.session.adminId, username: req.session.adminEmail || 'Admin' }
            : { userId: null, username: 'Invité' });
    const clientId = `${req.ip}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    realtimeService.addClient(res);
    realtimeService.setPresence(clientId, identity);

    const messages = await chatService.getRecentMessages();
    realtimeService.broadcastTo(res, { type: 'init', messages });
    realtimeService.broadcast({ type: 'presence', online: realtimeService.getPresenceList(), count: realtimeService.getPresenceList().length });

    req.on('close', () => {
        realtimeService.removeClient(res);
        realtimeService.removePresence(clientId);
        realtimeService.broadcast({ type: 'presence', online: realtimeService.getPresenceList(), count: realtimeService.getPresenceList().length });
    });
});

router.post('/api/chat/typing', isChatAuthenticated, async (req, res) => {
    try {
        const user = req.chatUser;
        realtimeService.broadcast({
            type: 'typing',
            userId: user.id,
            username: user.username,
        });
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/api/chat/react', isChatAuthenticated, async (req, res) => {
    try {
        const { messageId, reaction } = req.body;
        if (!messageId || !reaction) {
            return res.status(400).json({ error: 'messageId and reaction are required' });
        }

        const userId = req.chatUser.id;

        // Check if reaction already exists to toggle it
        const existing = await db.query(
            'SELECT id FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND reaction = $3',
            [messageId, userId, reaction]
        );

        let action;
        if (existing.rows.length > 0) {
            await chatService.removeReaction(messageId, userId, reaction);
            action = 'removed';
        } else {
            await chatService.addReaction(messageId, userId, reaction);
            action = 'added';
        }

        const reactionsResult = await db.query(
            'SELECT reaction, count(*)::int as count FROM message_reactions WHERE message_id = $1 GROUP BY reaction',
            [messageId]
        );
        const reactions = {};
        for (const r of reactionsResult.rows) {
            reactions[r.reaction] = r.count;
        }
        realtimeService.broadcast({ type: 'reaction', messageId, reactions });

        res.json({ action, messageId, reaction });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/api/chat/send', isChatAuthenticated, async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) return res.status(400).json({ error: 'Message content is required' });

        const message = await chatService.sendMessage(req.chatUser.id, content, 'chat', {
            username: req.chatUser.username,
            isAdmin: req.chatUser.isAdmin
        });
        realtimeService.broadcast({ type: 'message', message });
        res.json(message);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
