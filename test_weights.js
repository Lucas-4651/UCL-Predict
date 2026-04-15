const weightManager = require('./src/services/predictor/WeightManager');
const db = require('./src/config/database');

async function testWeights() {
    try {
        await weightManager.init();
        console.log('Weights loaded. Testing specific keys:');
        console.log('outcome_market:', weightManager.getWeight('outcome_market'));
        console.log('btts_internal:', weightManager.getWeight('btts_internal'));
        console.log('ou_volatility:', weightManager.getWeight('ou_volatility'));

        if (weightManager.getWeight('outcome_market') !== 0 && weightManager.getWeight('btts_internal') !== 0) {
            console.log('Verification SUCCESS');
        } else {
            console.log('Verification FAILED');
            process.exit(1);
        }
    } catch (err) {
        console.error('Error during verification:', err);
        process.exit(1);
    }
}

testWeights();
