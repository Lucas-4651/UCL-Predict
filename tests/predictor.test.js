const engine = require('../src/services/predictor/HeuristicEngine');
const weightManager = require('../src/services/predictor/WeightManager');
const db = require('../src/config/database');

describe('HeuristicEngine', () => {
    beforeAll(async () => {
        // Reset weights to defaults for deterministic tests
        await new Promise((resolve) => {
            db.run('DELETE FROM weights', () => resolve());
        });
        await weightManager.init();
    });

    test('predict returns complete results for a match', async () => {
        const mockMatch = {
            homeTeam: { name: 'Team A', ranking: 1, form: 0.8 },
            awayTeam: { name: 'Team B', ranking: 10, form: 0.4 },
            odds: { home: 1.5, draw: 3.5, away: 4.5, bttsYes: 1.8, ouOver: 1.9 }
        };

        const res = await engine.predict(mockMatch);
        expect(res).toHaveProperty('outcome');
        expect(res).toHaveProperty('outcomeConf');
        expect(res).toHaveProperty('btts');
        expect(res).toHaveProperty('bttsConf');
        expect(res).toHaveProperty('ou');
        expect(res).toHaveProperty('ouConf');
        expect(res.outcomeConf).toBeGreaterThanOrEqual(0);
        expect(res.outcomeConf).toBeLessThanOrEqual(1);
    });

    test('Strong Home Favorite should likely predict 1', async () => {
        const mockMatch = {
            homeTeam: { name: 'Giant', ranking: 1, form: 0.9 },
            awayTeam: { name: 'Tiny', ranking: 100, form: 0.1 },
            odds: { home: 1.1, draw: 8.0, away: 15.0, bttsYes: 2.5, ouOver: 1.5 }
        };
        const res = await engine.predict(mockMatch);
        expect(res.outcome).toBe('1');
        expect(res.outcomeConf).toBeGreaterThan(0.6);
    });

    test('Perfectly balanced teams should likely predict 1 due to home bias', async () => {
        const mockMatch = {
            homeTeam: { name: 'Team A', ranking: 10, form: 0.5 },
            awayTeam: { name: 'Team B', ranking: 10, form: 0.5 },
            odds: { home: 3.0, draw: 3.0, away: 3.0, bttsYes: 2.0, ouOver: 2.0 }
        };
        const res = await engine.predict(mockMatch);
        expect(res.outcome).toBe('1');
    });

    test('BTTS should be No if one team has zero form', async () => {
        const mockMatch = {
            homeTeam: { name: 'Scorer', ranking: 1, form: 0.9 },
            awayTeam: { name: 'Wall', ranking: 10, form: 0.0 },
            odds: { home: 1.2, draw: 5.0, away: 10.0, bttsYes: 3.0, ouOver: 2.0 }
        };
        const res = await engine.predict(mockMatch);
        expect(res.btts).toBe('No');
    });

    test('OU should be Over if both teams have very high form', async () => {
        const mockMatch = {
            homeTeam: { name: 'Attacker A', ranking: 5, form: 0.9 },
            awayTeam: { name: 'Attacker B', ranking: 6, form: 0.9 },
            odds: { home: 2.5, draw: 3.5, away: 2.5, bttsYes: 1.5, ouOver: 1.5 }
        };
        const res = await engine.predict(mockMatch);
        expect(res.ou).toBe('Over');
    });
});

describe('HeuristicEngine Poisson Math', () => {
    test('calculatePoisson returns correct value', () => {
        // For lambda=1.0, P(1) should be e^-1 * 1^1 / 1! approx 0.367879
        const prob = engine._calculatePoisson(1, 1.0);
        expect(prob).toBeCloseTo(0.367879, 6);
    });

    test('calculatePoisson returns 0 for impossible cases', () => {
        // If lambda is 0, P(1) must be 0
        const prob = engine._calculatePoisson(1, 0.0);
        expect(prob).toBe(0);
    });

    test('calculatePoisson returns 1 for lambda 0 and x 0', () => {
        const prob = engine._calculatePoisson(0, 0.0);
        expect(prob).toBe(1);
    });
});

