const WeightManager = require('../src/services/predictor/WeightManager');
const HeuristicEngine = require('../src/services/predictor/HeuristicEngine');

// Mock the intelligence service collaborators so prediction runs deterministically
// without hitting the real network (momentum / team DNA lookups).
jest.mock('../src/services/intelligence/LeagueIntelligenceService', () => ({
    getMomentum: jest.fn().mockResolvedValue({ delta: 0 }),
    getTeamDNA: jest.fn().mockReturnValue(null),
    isKryptonite: jest.fn().mockReturnValue(false),
}));

const sampleMatch = {
    homeTeam: { name: 'Paris SG' },
    awayTeam: { name: 'Real Madrid' },
    homeRanking: 2,
    awayRanking: 10,
    homeForm: 0.8,
    awayForm: 0.5,
    isHome: true,
    marketOdds: { home: 1.8, draw: 3.4, away: 4.5 }
};

beforeAll(async () => {
    await WeightManager.init();
});

describe('Heuristic Engine', () => {
    test('predict returns a valid result with market outcomes', async () => {
        const prediction = await HeuristicEngine.predict(sampleMatch);

        expect(prediction).toBeDefined();
        expect(['home', 'draw', 'away']).toContain(prediction.outcome);
        expect(['Yes', 'No']).toContain(prediction.btts);
        expect(['Over', 'Under']).toContain(prediction.ou);
    });

    test('predicted confidences are bounded between 0 and 1', async () => {
        const prediction = await HeuristicEngine.predict(sampleMatch);
        expect(prediction.outcomeConf).toBeGreaterThanOrEqual(0);
        expect(prediction.outcomeConf).toBeLessThanOrEqual(1);
        expect(prediction.bttsConf).toBeGreaterThanOrEqual(0);
        expect(prediction.bttsConf).toBeLessThanOrEqual(1);
        expect(prediction.ouConf).toBeGreaterThanOrEqual(0);
        expect(prediction.ouConf).toBeLessThanOrEqual(1);
    });

    test('caching avoids recomputation and returns identical result', async () => {
        const first = await HeuristicEngine.predict(sampleMatch);
        const second = await HeuristicEngine.predict(sampleMatch);
        expect(first).toBe(second);
    });
});
