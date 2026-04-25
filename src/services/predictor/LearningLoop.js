const weightManager = require('./WeightManager');
const settings = require('../../config/settings');

class LearningLoop {
    calculateBrierScore(prob, isCorrect) {
        const outcome = isCorrect ? 1 : 0;
        return Math.pow(prob - outcome, 2);
    }

    async adjustWeights(prediction, actualOutcome, factors, market = 'outcome', score = null, actualGoals = { home: null, away: null }) {
        // Calculate decayed learning rate
        const predictionCount = await this._getPredictionCount();
        const learningRate = settings.LEARNING_RATE / (1 + settings.LEARNING_DECAY * predictionCount);

        console.log(`adjustWeights called: market=${market}, LR=${learningRate.toFixed(6)}, prediction=${JSON.stringify(prediction)}, goals=${JSON.stringify(actualGoals)}`);

        // 1. Calculate the signed error for the market
        const error = this._calculateError(prediction, actualOutcome, market);

        // 2. Use Brier Score for magnitude of adjustment if available
        // If score is null, we fallback to a default confidence
        const brierScore = score !== null ? score : 0.5;
        const magnitude = Math.sqrt(brierScore); // Use root of Brier Score as a linear penalty

        // Special handling for outcome market using Lambda Error
        if (market === 'outcome') {
            console.log('Inside outcome block');
            if (actualGoals && actualGoals.home !== null) {
                console.log('Inside goals block');
                const { home: lambda_home, away: lambda_away } = prediction.lambdas || {};
                console.log(`Lambdas: ${lambda_home}, ${lambda_away}`);
                if (lambda_home !== undefined && lambda_away !== undefined) {
                    console.log('Inside lambda block');
                    const homeLambdaError = actualGoals.home - lambda_home;
                    const awayLambdaError = actualGoals.away - lambda_away;

                    const outcomeFactors = Object.entries(factors).filter(([f]) => f.startsWith('outcome'));

                    for (const [factor, value] of outcomeFactors) {
                        let totalAdjustment = 0;

                        if (factor === 'outcome_bias') {
                            totalAdjustment = homeLambdaError * 1.0 * learningRate;
                        } else if (factor === 'outcome_ranking' || factor === 'outcome_form') {
                            const homeContribution = value;
                            const awayContribution = -value;
                            totalAdjustment = (homeLambdaError * homeContribution + awayLambdaError * awayContribution) * learningRate;
                        }

                        const currentWeight = weightManager.getWeight(factor);
                        const nextWeight = Math.min(Math.max(currentWeight + totalAdjustment, 0), 1);
                        console.log(`Adjusting ${factor}: ${currentWeight} + ${totalAdjustment} -> ${nextWeight}`);
                        await weightManager.saveWeight(factor, nextWeight);
                    }
                }
            }
        }

        // Adjust weights for binary markets (BTTS, OU) using Brier Score scaled error
        if (market !== 'outcome') {
            for (const [factor, value] of Object.entries(factors)) {
                if (!factor.startsWith(market === 'btts' ? 'btts' : 'ou')) continue;

                const currentWeight = weightManager.getWeight(factor);
                const adjustment = error * value * learningRate * magnitude;
                await weightManager.saveWeight(factor, Math.min(Math.max(currentWeight + adjustment, 0), 1));
            }
        }

        return { error, brierScore, updatedWeights: weightManager.weights };
    }

    _calculateError(prediction, actual, market) {
        console.log(`_calculateError called: market=${market}, pred=${JSON.stringify(prediction)}, actual=${actual}`);

        // Handle prediction being the full object or just the outcome string
        const predValue = (typeof prediction === 'object' && prediction !== null)
            ? (market === 'outcome' ? prediction.outcome : (market === 'btts' ? prediction.btts : prediction.ou))
            : prediction;

        if (market === 'outcome') {
            const map = { '1': 1, 'X': 0, '2': -1 };
            const predVal = map[predValue] || 0;
            const actualVal = map[actual] || 0;
            return actualVal - predVal;
        }

        // For binary markets (BTTS, OU), 1 for Yes/Over, 0 for No/Under
        const map = { 'Yes': 1, 'No': 0, 'Over': 1, 'Under': 0 };
        const predVal = map[predValue] || 0;
        const actualVal = map[actual] || 0;
        return actualVal - predVal;
    }

    async _getPredictionCount() {
        const db = require('../../config/database');
        const res = await db.query('SELECT COUNT(*) as count FROM predictions');
        return res.rows[0] ? parseInt(res.rows[0].count) : 0;
    }
}

module.exports = new LearningLoop();
