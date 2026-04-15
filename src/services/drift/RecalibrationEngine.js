const weightManager = require('../predictor/WeightManager');
const settings = require('../../config/settings');

class RecalibrationEngine {
    async recalibrate() {
        console.log('[RecalibrationEngine] Triggering emergency recalibration...');
        
        // 1. Reset biased weights to neutral or initial values
        const initialWeights = {
            ranking_delta: 0.4,
            recent_form: 0.3,
            odds_implication: 0.2,
            home_bias: 0.1
        };
        
        for (const [factor, value] of Object.entries(initialWeights)) {
            await weightManager.saveWeight(factor, value);
        }
        
        // 2. Boost learning rate temporarily (simulated by adjusting settings if it were dynamic)
        console.log('[RecalibrationEngine] Weights reset to Day 0 values. Ready for fast adaptation.');
        
        await weightManager.loadWeights();
        return { status: 'recalibrated', timestamp: new Date() };
    }
}

module.exports = new RecalibrationEngine();
