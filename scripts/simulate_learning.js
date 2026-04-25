const weightManager = require('./src/services/predictor/WeightManager');
const learningLoop = require('./src/services/predictor/LearningLoop');
const dbService = require('./src/services/dbService');
const predictor = require('./src/services/predictor/HeuristicEngine');
const db = require('./src/config/database');

async function simulate() {
    try {
        console.log('--- Starting End-to-End Learning Simulation ---');

        // 1. Setup: Clean weights and DB
        console.log('Cleaning database...');
        await new Promise((resolve, reject) => {
            db.run('DELETE FROM weights', (err) => err ? reject(err) : resolve());
        });
        await new Promise((resolve, reject) => {
            db.run('DELETE FROM predictions', (err) => err ? reject(err) : resolve());
        });

        console.log('Initializing WeightManager...');
        await weightManager.init();

        const mockMatch = {
            homeTeam: { name: 'HomeTeam', ranking: 1, form: 0.9 },
            awayTeam: { name: 'AwayTeam', ranking: 10, form: 0.1 },
            odds: { home: 1.2, draw: 5.0, away: 10.0 }
        };

        console.log('\nScenario: Strong Home Favorite consistently scoring 3-0');

        for (let i = 1; i <= 5; i++) {
            console.log(`\nRound ${i}:`);

            // Predict
            const pred = await predictor.predict(mockMatch);
            console.log(`Prediction: ${pred.outcome} (Conf: ${pred.outcomeConf.toFixed(2)})`);
            console.log(`Expected Goals: Home ${pred.lambdas.home.toFixed(2)}, Away ${pred.lambdas.away.toFixed(2)}`);

            // Log to DB
            const matchId = `match_${i}`;
            await dbService.savePrediction({
                match_id: matchId,
                home_team: 'HomeTeam',
                away_team: 'AwayTeam',
                predicted_outcome: pred.outcome,
                confidence: pred.outcomeConf,
                lambda_home: pred.lambdas.home,
                lambda_away: pred.lambdas.away,
                prob_matrix: pred.matrix,
                predicted_probs: pred.probabilities
            });

            // Feed back actual result: 3-0
            const actualHomeGoals = 3;
            const actualAwayGoals = 0;
            const actualOutcome = '1';

            const probActual = pred.probabilities.outcome[actualOutcome];
            const brierScore = learningLoop.calculateBrierScore(probActual, true);

            // adjustWeights call
            const factors = {
                outcome_ranking: 0.5, outcome_form: 0.5, outcome_bias: 0.5
            };
            await learningLoop.adjustWeights(
                pred,
                actualOutcome,
                factors,
                'outcome',
                brierScore,
                { home: actualHomeGoals, away: actualAwayGoals }
            );

            console.log(`Learning: Actual 3-0. Brier Score: ${brierScore.toFixed(4)}`);
            console.log(`New Weights: Ranking=${weightManager.getWeight('outcome_ranking').toFixed(3)}, Form=${weightManager.getWeight('outcome_form').toFixed(3)}`);
        }

        console.log('\n--- Simulation Complete ---');
    } catch (error) {
        console.error('SIMULATION ERROR:', error);
        process.exit(1);
    }
}

simulate();
