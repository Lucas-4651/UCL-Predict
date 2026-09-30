const weightManager = require('./WeightManager');
const settings = require('../../config/settings');
const db = require('../../config/database');
const fs = require('fs');
const path = require('path');
const predictor = require('./HeuristicEngine');

class LearningLoop {
    constructor() {
        this.velocity = {}; // momentum velocity per weight
        this.velocityFile = path.join(process.cwd(), 'velocity_cache.json');
        this.loadVelocity();
    }

    loadVelocity() {
        try {
            if (fs.existsSync(this.velocityFile)) {
                const data = fs.readFileSync(this.velocityFile, 'utf8');
                this.velocity = JSON.parse(data);
            }
        } catch (err) {
            console.warn('[LearningLoop] Could not load velocity cache:', err.message);
            this.velocity = {};
        }
    }

    saveVelocity() {
        try {
            fs.writeFileSync(this.velocityFile, JSON.stringify(this.velocity, null, 2));
        } catch (err) {
            console.error('[LearningLoop] Failed to write velocity cache:', err.message);
        }
    }

    calculateBrierScore(prob, isCorrect) {
        const outcome = isCorrect ? 1 : 0;
        return Math.pow(prob - outcome, 2);
    }

    async adjustWeights(prediction, actualOutcome, factors, market = 'outcome', score = null, actualGoals = { home: null, away: null }) {
        const predictionCount = await this._getPredictionCount();
        const learningRate = settings.LEARNING_RATE / (1 + settings.LEARNING_DECAY * predictionCount);

        if (process.env.DEBUG_WEIGHTS === '1') {
            console.log(`[LearningLoop] adjustWeights: market=${market}, LR=${learningRate.toFixed(6)}`);
        }

        // 1. Calculate the signed error for the market
        const error = this._calculateError(prediction, actualOutcome, market);

        // 2. Use Brier Score for magnitude of adjustment if available
        const brierScore = score !== null ? score : 0.5;
        const magnitude = Math.sqrt(brierScore);

        // Prepare proposed weight updates
        const proposedWeights = { ...weightManager.weights };
        const updates = [];

        // Special handling for outcome market using Lambda Error
        if (market === 'outcome') {
            if (actualGoals && actualGoals.home !== null) {
                const { home: lambda_home, away: lambda_away } = prediction.lambdas || {};
                if (lambda_home !== undefined && lambda_away !== undefined) {
                    const homeLambdaError = actualGoals.home - lambda_home;
                    const awayLambdaError = actualGoals.away - lambda_away;

                    const outcomeFactors = Object.entries(factors).filter(([f]) => f.startsWith('outcome'));

                    for (const [factor, value] of outcomeFactors) {
                        let gradient = 0;

                        if (factor === 'outcome_bias') {
                            gradient = homeLambdaError * 1.0;
                        } else if (factor === 'outcome_ranking' || factor === 'outcome_form') {
                            const homeContribution = value;
                            const awayContribution = -value;
                            gradient = (homeLambdaError * homeContribution + awayLambdaError * awayContribution);
                        }

                        if (gradient !== 0) {
                            updates.push({ factor, gradient, value });
                        }
                    }
                }
            }
        }

        // Adjust weights for binary markets (BTTS, OU) using Brier Score scaled error
        if (market !== 'outcome') {
            for (const [factor, value] of Object.entries(factors)) {
                const prefix = market === 'btts' ? 'btts' : 'ou';
                if (!factor.startsWith(prefix)) continue;

                const gradient = error * value * magnitude;
                if (gradient !== 0) {
                    updates.push({ factor, gradient, value });
                }
            }
        }

        // Apply momentum + L2 regularization + learning rate
        for (const { factor, gradient, value } of updates) {
            const currentWeight = weightManager.getWeight(factor);

            // Initialize velocity for this factor if not exists
            if (!(factor in this.velocity)) {
                this.velocity[factor] = 0;
            }

            // L2 regularization: gradient += lambda * weight
            const l2Gradient = settings.L2_REGULARIZATION * currentWeight;
            const totalGradient = gradient + l2Gradient;

            // Momentum update: velocity = momentum * velocity - learningRate * gradient
            this.velocity[factor] = settings.MOMENTUM * this.velocity[factor] - learningRate * totalGradient;

            // Weight update
            const newWeight = currentWeight + this.velocity[factor];

            // Clip to [0, 1]
            const clippedWeight = Math.min(Math.max(newWeight, 0), 1);

            proposedWeights[factor] = clippedWeight;

            if (process.env.DEBUG_WEIGHTS === '1') {
                console.log(`[LearningLoop] ${factor}: grad=${gradient.toFixed(6)}, l2=${l2Gradient.toFixed(6)}, vel=${this.velocity[factor].toFixed(6)}, ${currentWeight.toFixed(4)} -> ${clippedWeight.toFixed(4)}`);
            }
        }

        // Validation step (temporal cross-validation on recent predictions)
        const validationPassed = await this._validateWeights(proposedWeights);
        if (validationPassed) {
            // Commit the proposed weights
            for (const factor of Object.keys(proposedWeights)) {
                if (proposedWeights[factor] !== weightManager.weights[factor]) {
                    await weightManager.saveWeight(factor, proposedWeights[factor]);
                }
            }
            this.saveVelocity();
            if (process.env.DEBUG_WEIGHTS === '1') {
                console.log('[LearningLoop] Weights updated and validated');
            }
        } else {
            if (process.env.DEBUG_WEIGHTS === '1') {
                console.log('[LearningLoop] Validation failed, weights not updated');
            }
            // Revert velocity for factors that would have changed? Keep velocity as is (it's internal state).
        }

        return { error, brierScore, updatedWeights: weightManager.weights };
    }

    async _validateWeights(proposedWeights) {
        // Temporal cross-validation: re-evaluate recent predictions with proposed weights
        // and compare Brier scores. Requires stored match features.
        
        const windowSize = settings.VALIDATION_WINDOW;
        const minImprovement = settings.MIN_IMPROVEMENT;

        try {
            const res = await db.query(
                `SELECT match_features, actual_outcome, actual_home_goals, actual_away_goals, market
                 FROM predictions
                 WHERE actual_outcome IS NOT NULL AND match_features IS NOT NULL
                 ORDER BY created_at DESC
                 LIMIT $1`,
                [windowSize]
            );

            if (res.rows.length < 10) {
                // Not enough data with features for validation, allow update
                return true;
            }

            // Temporarily swap weights to proposed, evaluate, then restore
            const originalWeights = { ...weightManager.weights };
            
            // Apply proposed weights
            for (const [factor, value] of Object.entries(proposedWeights)) {
                weightManager.weights[factor] = value;
            }

            let currentBrier = 0;
            let proposedBrier = 0;
            let count = 0;

            for (const row of res.rows) {
                if (row.market !== 'outcome') continue;
                const features = row.match_features;
                if (!features) continue;

                const actual = row.actual_outcome;
                const actualHome = row.actual_home_goals;
                const actualAway = row.actual_away_goals;
                
                // Re-run prediction with ORIGINAL weights (current)
                const predCurrent = await predictor.predict(features);
                
                // Calculate Brier for original
                let brierCurrent = 0;
                const classes = ['1', 'X', '2'];
                for (const c of classes) {
                    const p = predCurrent.probabilities.outcome[c] || 0;
                    const y = (c === actual) ? 1 : 0;
                    brierCurrent += Math.pow(p - y, 2);
                }
                currentBrier += brierCurrent;

                // Swap to proposed weights
                for (const [factor, value] of Object.entries(proposedWeights)) {
                    weightManager.weights[factor] = value;
                }
                
                // Re-run prediction with PROPOSED weights
                const predProposed = await predictor.predict(features);
                
                // Calculate Brier for proposed
                let brierProposed = 0;
                for (const c of classes) {
                    const p = predProposed.probabilities.outcome[c] || 0;
                    const y = (c === actual) ? 1 : 0;
                    brierProposed += Math.pow(p - y, 2);
                }
                proposedBrier += brierProposed;

                // Restore original weights for next iteration
                for (const [factor, value] of Object.entries(originalWeights)) {
                    weightManager.weights[factor] = value;
                }

                count++;
            }

            // Restore original weights permanently
            for (const [factor, value] of Object.entries(originalWeights)) {
                weightManager.weights[factor] = value;
            }

            if (count === 0) return true;

            currentBrier /= count;
            proposedBrier /= count;

            const improvement = currentBrier - proposedBrier;

            if (process.env.DEBUG_WEIGHTS === '1') {
                console.log(`[LearningLoop] Validation: current Brier=${currentBrier.toFixed(4)}, proposed Brier=${proposedBrier.toFixed(4)}, improvement=${improvement.toFixed(4)} on ${count} samples`);
            }

            // Accept only if improvement exceeds minimum threshold
            return improvement >= minImprovement;
        } catch (err) {
            console.error('[LearningLoop] Validation error:', err.message);
            // Restore original weights on error
            for (const [factor, value] of Object.entries(originalWeights)) {
                weightManager.weights[factor] = value;
            }
            return true; // fail open
        }
    }

    _calculateError(prediction, actual, market) {
        const predValue = (typeof prediction === 'object' && prediction !== null)
            ? (market === 'outcome' ? prediction.outcome : (market === 'btts' ? prediction.btts : prediction.ou))
            : prediction;

        if (market === 'outcome') {
            const map = { '1': 1, 'X': 0, '2': -1 };
            const predVal = map[predValue] || 0;
            const actualVal = map[actual] || 0;
            return actualVal - predVal;
        }

        const map = { 'Yes': 1, 'No': 0, 'Over': 1, 'Under': 0 };
        const predVal = map[predValue] || 0;
        const actualVal = map[actual] || 0;
        return actualVal - predVal;
    }

    async _getPredictionCount() {
        const res = await db.query('SELECT COUNT(*) as count FROM predictions');
        return res.rows[0] ? parseInt(res.rows[0].count) : 0;
    }
}

module.exports = new LearningLoop();