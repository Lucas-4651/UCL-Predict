const db = require('../../config/database');
const settings = require('../../config/settings');
const recalibrationService = require('./RecalibrationService');

class HealthMonitor {
    constructor() {
        this.state = 'HEALTHY'; // HEALTHY, DEGRADED, RECOVERING, RECALIBRATING, CRITICAL
        this.apiErrorCount = 0;
        this.lastCheckTime = Date.now();
    }

    setState(newState) {
        if (this.state !== newState) {
            console.log(`[HealthMonitor] State transition: ${this.state} -> ${newState}`);
            this.state = newState;
        }
    }

    getState() {
        return this.state;
    }

    reportApiError() {
        this.apiErrorCount++;
    }

    async checkPredictionDrift() {
        const accuracy = await this.getRollingAccuracy();
        if (accuracy === null) return null;

        console.log(`[HealthMonitor] Drift Check: Accuracy=${(accuracy * 100).toFixed(1)}% (Threshold=${(settings.DRIFT_THRESHOLD * 100).toFixed(1)}%)`);

        if (accuracy < settings.DRIFT_THRESHOLD) {
            console.log(`[HealthMonitor] ⚠️ Prediction drift detected! Accuracy ${accuracy.toFixed(2)} < ${settings.DRIFT_THRESHOLD}`);
            this.setState('RECALIBRATING');
        } else {
            if (this.state === 'RECALIBRATING') {
                this.setState('HEALTHY');
            }
        }
        return accuracy;
    }

    async getRollingAccuracy(windowSize = 100) {
        try {
            const sql = `
                SELECT AVG(is_correct) as accuracy, COUNT(*) as count
                FROM (
                    SELECT is_correct
                    FROM predictions
                    WHERE actual_outcome IS NOT NULL
                    ORDER BY created_at DESC
                    LIMIT ${windowSize}
                ) as sub
            `;
            const res = await db.query(sql);
            const row = res.rows[0];
            if (!row || row.count < 20) return null;
            return parseFloat(row.accuracy);
        } catch (err) {
            console.error(`[HealthMonitor] Accuracy calculation failed: ${err.message}`);
            return null;
        }
    }

    async checkSystemHealth() {
        try {
            // 0. Prediction Drift Check
            await this.checkPredictionDrift();

            // 1. Memory Check
            const ramUsage = process.memoryUsage().heapUsed / 1024 / 1024;

            // 2. DB Latency Check
            const start = Date.now();
            await db.query('SELECT 1');
            const dbLatency = Date.now() - start;

            // 3. API Error Rate
            const errorRate = this.apiErrorCount;
            this.apiErrorCount = 0; // Reset for next window

            console.log(`[HealthMonitor] Health Check: RAM=${ramUsage.toFixed(1)}MB, DB=${dbLatency}ms, APIErrors=${errorRate}`);

            if (ramUsage > 800 || dbLatency > 200 || errorRate > 10) {
                this.setState('CRITICAL');
            } else if (ramUsage > 500 || dbLatency > 50 || errorRate > 3) {
                this.setState('DEGRADED');
            } else {
                this.setState('HEALTHY');
            }
        } catch (err) {
            console.error(`[HealthMonitor] Health check failed: ${err.message}`);
            this.setState('CRITICAL');
        }

        // Trigger recalibration if the state was set to RECALIBRATING during drift check
        if (this.state === 'RECALIBRATING') {
            await recalibrationService.recalibrate();
        }
    }
}

module.exports = new HealthMonitor();
