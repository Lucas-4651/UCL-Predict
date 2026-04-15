const learningLoop = require('../src/services/predictor/LearningLoop');
const weightManager = require('../src/services/predictor/WeightManager');
const db = require('../src/config/database');

describe('LearningLoop', () => {
    beforeAll(async () => {
        await new Promise((resolve) => {
            db.run('DELETE FROM weights', () => resolve());
        });
        await weightManager.init();
    });

    test('calculateBrierScore should return correct value', () => {
        // prob = 0.8, isCorrect = true (outcome = 1) -> (0.8 - 1)^2 = 0.04
        expect(learningLoop.calculateBrierScore(0.8, true)).toBeCloseTo(0.04, 5);
        // prob = 0.8, isCorrect = false (outcome = 0) -> (0.8 - 0)^2 = 0.64
        expect(learningLoop.calculateBrierScore(0.8, false)).toBeCloseTo(0.64, 5);
    });

    test('adjustWeights should use Lambda Error for outcome market', async () => {
        const factors = { outcome_ranking: 0.5, outcome_form: 0.5, outcome_bias: 0.5 };
        const prediction = {
            lambdas: { home: 1.0, away: 1.0 }
        };
        const actualGoals = { home: 2, away: 0 }; // Home scored more than predicted
        const actualOutcome = '1';

        const oldWeight = weightManager.getWeight('outcome_ranking');

        await learningLoop.adjustWeights(
            prediction,
            actualOutcome,
            factors,
            'outcome',
            0.8,
            actualGoals
        );

        const newWeight = weightManager.getWeight('outcome_ranking');
        // homeLambdaError = 2 - 1.0 = 1.0. Since ranking factor is positive, weight should increase.
        expect(newWeight).toBeGreaterThan(oldWeight);
    });

    test('adjustWeights should use Brier Score for binary markets (BTTS)', async () => {
        const factors = { btts_form: 0.5 };
        const prediction = 'No';
        const actual = 'Yes';
        const brierScore = 0.64; // confident it was No, but it was Yes

        const oldWeight = weightManager.getWeight('btts_form');

        await learningLoop.adjustWeights(
            prediction,
            actual,
            factors,
            'btts',
            brierScore
        );

        const newWeight = weightManager.getWeight('btts_form');
        // error = 1 - 0 = 1. Weight should increase.
        expect(newWeight).toBeGreaterThan(oldWeight);
    });
});
