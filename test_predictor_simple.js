const engine = require('./src/services/predictor/HeuristicEngine');
const weightManager = require('./src/services/predictor/WeightManager');

async function run() {
    try {
        await weightManager.init();
        const mockMatch = {
            homeTeam: { name: 'Team A', ranking: 1, form: 0.8 },
            awayTeam: { name: 'Team B', ranking: 10, form: 0.4 },
            odds: { home: 1.5, draw: 3.5, away: 4.5 }
        };
        const res = await engine.predict(mockMatch);
        console.log('Prediction Result:', res);
        process.exit(0);
    } catch (e) {
        console.error('DETAILED ERROR:', e);
        process.exit(1);
    }
}
run();
