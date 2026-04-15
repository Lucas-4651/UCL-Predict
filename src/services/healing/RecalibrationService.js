const weightManager = require('../predictor/WeightManager');
const healthMonitor = require('./HealthMonitor');

class RecalibrationService {
    async recalibrate() {
        console.log('[RecalibrationService] Starting automatic recalibration process...');

        try {
            // 1. Reset weights to base defaults
            await weightManager.resetWeights();

            // 2. Optional: Clear recent prediction history to prevent immediate re-triggering of drift
            // We keep the data for analysis but we might want to ignore the last 100 predictions
            // in the next drift check. However, since we reset weights, the new predictions
            // will be based on defaults.

            console.log('[RecalibrationService] Recalibration complete. System returned to baseline.');

            // 3. Return system to HEALTHY state
            healthMonitor.setState('HEALTHY');

        } catch (err) {
            console.error(`[RecalibrationService] Recalibration failed: ${err.message}`);
            healthMonitor.setState('CRITICAL');
        }
    }
}

module.exports = new RecalibrationService();
