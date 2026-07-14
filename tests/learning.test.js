const WeightManager = require('../src/services/predictor/WeightManager');
const LearningLoop = require('../src/services/predictor/LearningLoop');

// Mock db so adjustWeights' internal _getPredictionCount and saveWeight never
// hit the real cloud database (keeps the suite fast and deterministic).
jest.mock('../src/config/database', () => ({
    query: jest.fn().mockResolvedValue({ rows: [] }),
    close: jest.fn().mockResolvedValue(),
    getClient: jest.fn(),
}));

describe('Learning Loop', () => {
    beforeEach(async () => {
        await WeightManager.init();
    });

    test('weights expose default factor values', () => {
        const weights = WeightManager.getAllWeights();
        expect(weights.outcome_market).toBeCloseTo(0.5);
        expect(weights.btts_market).toBeCloseTo(0.5);
        expect(weights.ou_market).toBeCloseTo(0.5);
    });

    test('a wrong BTTS prediction decreases the BTTS weight', async () => {
        WeightManager.setWeight('btts_market', 0.5);
        const before = WeightManager.getWeight('btts_market');

        // Predicted "Yes" but actual "No" => negative error => weight moves down
        await LearningLoop.adjustWeights({ btts: 'Yes' }, 'No', { btts_market: 1.0 }, 'btts');

        const after = WeightManager.getWeight('btts_market');
        expect(after).toBeLessThan(before);
    });

    test('a wrong OU prediction decreases the OU weight and stays bounded', async () => {
        WeightManager.setWeight('ou_market', 0.5);
        const before = WeightManager.getWeight('ou_market');

        await LearningLoop.adjustWeights({ ou: 'Over' }, 'Under', { ou_market: 1.0 }, 'ou');

        const after = WeightManager.getWeight('ou_market');
        expect(after).toBeLessThan(before);
        expect(after).toBeGreaterThanOrEqual(0);
        expect(after).toBeLessThanOrEqual(1);
    });
});
