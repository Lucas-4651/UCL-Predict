const learningLoop = require('./src/services/predictor/LearningLoop');
const weightManager = require('./src/services/predictor/WeightManager');
const db = require('./src/config/database');

async function run() {
    console.log('Starting LearningLoop Verification...');

    // Reset weights
    await new Promise((resolve) => {
        db.run('DELETE FROM weights', () => resolve());
    });
    await weightManager.init();

    // Test 1: Brier Score
    const bs = learningLoop.calculateBrierScore(0.8, true);
    console.log(`Brier Score (0.8, true): ${bs} (Expected: 0.04)`);

    // Test 2: Outcome Weights (Lambda Error)
    const factors = { outcome_ranking: 0.5, outcome_form: 0.5, outcome_bias: 0.5 };
    const prediction = { lambdas: { home: 1.0, away: 1.0 } };
    const actualGoals = { home: 2, away: 0 };
    const oldWeight = weightManager.getWeight('outcome_ranking');

    await learningLoop.adjustWeights(prediction, '1', factors, 'outcome', 0.8, actualGoals);
    const newWeight = weightManager.getWeight('outcome_ranking');
    console.log(`Outcome Weight: ${oldWeight} -> ${newWeight} (Expected: Increase)`);

    // Test 3: Binary Weights (Brier Score)
    const bttsFactors = { btts_form: 0.5 };
    const oldBttsWeight = weightManager.getWeight('btts_form');
    await learningLoop.adjustWeights('No', 'Yes', bttsFactors, 'btts', 0.64);
    const newBttsWeight = weightManager.getWeight('btts_form');
    console.log(`BTTS Weight: ${oldBttsWeight} -> ${newBttsWeight} (Expected: Increase)`);
}

run().catch(console.error);
