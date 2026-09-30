const db = require('../../config/database');
const sportyClient = require('../../api/sportyClient');
const formService = require('./FormService');
const predictor = require('./HeuristicEngine');
const settings = require('../../config/settings');
const dbService = require('../dbService');
const realtimeService = require('../realtimeService');
const healthMonitor = require('../healing/HealthMonitor');

// Pure computation: given an array of already-populated matches and a ranking
// map, return the predictions array. Shared by the on-demand route and the
// pre-compute job so the logic never drifts.
async function computePredictionsForMatches(matches) {
    const predictionPromises = matches.map(async (match) => {
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
        const rankingData = await formService.getRanking();
        const rankMap = {};
        if (rankingData && Array.isArray(rankingData.teams)) {
            rankingData.teams.forEach(t => { rankMap[t.name] = t.position; });
        }

        const predictorMatch = {
            homeTeam: {
                name: match.homeTeam.name,
                ranking: rankMap[match.homeTeam.name] || 0,
                form: homeForm
            },
            awayTeam: {
                name: match.awayTeam.name,
                ranking: rankMap[match.awayTeam.name] || 0,
                form: awayForm
            },
            homeRanking: rankMap[match.homeTeam.name] || 0,
            awayRanking: rankMap[match.awayTeam.name] || 0,
            homeForm: homeForm,
            awayForm: awayForm,
            odds: odds
        };
        const pred = await predictor.predict(predictorMatch);

        await dbService.savePrediction({
            match_id: match.id || `${match.homeTeam.name}-${match.awayTeam.name}-${Date.now()}`,
            home_team: match.homeTeam.name,
            away_team: match.awayTeam.name,
            predicted_outcome: pred.outcome,
            confidence: pred.outcomeConf,
            lambda_home: pred.lambdas.home,
            lambda_away: pred.lambdas.away,
            prob_matrix: null,
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

    return Promise.all(predictionPromises);
}

// Build a ranking map from FormService (reused across rounds).
async function getRankingMap() {
    const rankingData = await formService.getRanking();
    const rankingMap = {};
    if (rankingData && Array.isArray(rankingData.teams)) {
        rankingData.teams.forEach(t => { rankingMap[t.name] = t.position; });
    }
    return rankingMap;
}

function findRound(rounds, roundNumber) {
    return (rounds || []).find(r => r && r.roundNumber === roundNumber);
}

// Compute + cache a specific round. Returns the round number if computed, or
// null if the round is not yet populated (matches missing) — the job retries.
async function computeAndCacheRound(roundNumber) {
    const matchesData = await sportyClient.getMatches(settings.LEAGUE_ID);
    const round = findRound(matchesData.rounds, roundNumber);

    // Not populated yet: cotes not available, nothing to compute.
    if (!round || !Array.isArray(round.matches) || round.matches.length === 0) {
        return null;
    }

    const rankingMap = await getRankingMap();
    const matches = round.matches.filter(m => m && m.homeTeam && m.awayTeam);
    const predictions = await computePredictionsForMatches(matches);

    const sql = `
        INSERT INTO prediction_cache (round_number, predictions, expected_start)
        VALUES ($1, $2, $3)
        ON CONFLICT (round_number) DO UPDATE
        SET predictions = EXCLUDED.predictions,
            computed_at = CURRENT_TIMESTAMP,
            expected_start = EXCLUDED.expected_start
    `;
    await db.query(sql, [
        roundNumber,
        JSON.stringify(predictions),
        round.expectedStart || null
    ]);

    realtimeService.broadcast({
        type: 'round-ready',
        roundNumber,
        count: predictions.length
    });
    return roundNumber;
}

async function getCachedRound(roundNumber) {
    const res = await db.query(
        'SELECT predictions, computed_at, expected_start FROM prediction_cache WHERE round_number = $1',
        [roundNumber]
    );
    if (res.rowCount === 0) return null;
    const row = res.rows[0];
    return {
        predictions: typeof row.predictions === 'string' ? JSON.parse(row.predictions) : row.predictions,
        computedAt: row.computed_at,
        expectedStart: row.expected_start
    };
}

// Find the current (first populated) round, then pre-compute R+1. Returns the
// round number that was computed, or null if R+1 is not yet available.
async function computeAndCacheNextRound(currentRound) {
    const matchesData = await sportyClient.getMatches(settings.LEAGUE_ID);
    const rounds = matchesData.rounds || [];
    const current = rounds.find(r => r && Array.isArray(r.matches) && r.matches.length > 0);
    if (!current) return null;

    const nextRoundNumber = current.roundNumber + 1;
    // Skip if we already computed this round.
    if (nextRoundNumber === currentRound) return null;

    return computeAndCacheRound(nextRoundNumber);
}

module.exports = {
    computePredictionsForMatches,
    computeAndCacheRound,
    getCachedRound,
    computeAndCacheNextRound
};
