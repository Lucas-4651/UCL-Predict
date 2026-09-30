const db = require('../../config/database');
const settings = require('../../config/settings');
const recalibrationService = require('./RecalibrationService');
const recoveryManager = require('./RecoveryManager');
const logger = require('./Logger');

class HealthMonitor {
    constructor() {
        this.state = 'HEALTHY'; // HEALTHY, DEGRADED, RECOVERING, RECALIBRATING, CRITICAL
        this.apiErrorCount = 0;
        this.lastCheckTime = Date.now();
    }

    setState(newState) {
        if (this.state !== newState) {
            logger.info(`[HealthMonitor] State transition: ${this.state} -> ${newState}`);
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

        logger.debug(`[HealthMonitor] Drift Check: Accuracy=${(accuracy * 100).toFixed(1)}% (Threshold=${(settings.DRIFT_THRESHOLD * 100).toFixed(1)}%)`);

        if (accuracy < settings.DRIFT_THRESHOLD) {
            logger.warn(`[HealthMonitor] ⚠️ Prediction drift detected! Accuracy ${accuracy.toFixed(2)} < ${settings.DRIFT_THRESHOLD}`);
            this.setState('RECALIBRATING');
            // Trigger recovery manager for drift
            await recoveryManager.handleEvent('drift_detected', { accuracy });
        } else {
            if (this.state === 'RECALIBRATING') {
                this.setState('HEALTHY');
            }
        }
        return accuracy;
    }

    async checkDegeneratePredictions() {
        try {
            // Check last hour of predictions for degeneracy
            const res = await db.query(
                `SELECT predicted_outcome, COUNT(*) as count,
                        AVG(confidence) as avg_confidence,
                        MIN(confidence) as min_confidence,
                        MAX(confidence) as max_confidence
                 FROM predictions
                 WHERE created_at > NOW() - INTERVAL '1 hour'
                 GROUP BY predicted_outcome`
            );

            const totalPredictions = res.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
            
            if (totalPredictions >= 10) {
                // Check 1: Single outcome dominates (low diversity)
                if (res.rows.length === 1) {
                    logger.warn('[HealthMonitor] Degenerate predictions: single outcome', { 
                        outcome: res.rows[0].predicted_outcome, 
                        count: res.rows[0].count 
                    });
                    await recoveryManager.handleEvent('degenerate_predictions', { 
                        outcome: res.rows[0].predicted_outcome, 
                        count: res.rows[0].count,
                        type: 'single_outcome'
                    });
                    return true;
                }

                // Check 2: One outcome dominates >90% (near-degenerate)
                const maxCount = Math.max(...res.rows.map(r => parseInt(r.count)));
                if (maxCount / totalPredictions > 0.9) {
                    const dominant = res.rows.find(r => parseInt(r.count) === maxCount);
                    logger.warn('[HealthMonitor] Degenerate predictions: dominant outcome', { 
                        outcome: dominant.predicted_outcome, 
                        count: dominant.count,
                        percentage: (maxCount / totalPredictions * 100).toFixed(1) + '%'
                    });
                    await recoveryManager.handleEvent('degenerate_predictions', { 
                        outcome: dominant.predicted_outcome, 
                        count: dominant.count,
                        percentage: maxCount / totalPredictions,
                        type: 'dominant_outcome'
                    });
                    return true;
                }

                // Check 3: All predictions have very high confidence but low accuracy (overconfident)
                const avgConfidence = res.rows.reduce((sum, r) => sum + parseFloat(r.avg_confidence) * parseInt(r.count), 0) / totalPredictions;
                if (avgConfidence > 0.85) {
                    // This might indicate overconfidence - check accuracy
                    const accuracy = await this.getRollingAccuracy(50);
                    if (accuracy !== null && accuracy < 0.5) {
                        logger.warn('[HealthMonitor] Degenerate predictions: overconfident but inaccurate', { 
                            avgConfidence: avgConfidence.toFixed(3),
                            accuracy: accuracy.toFixed(3)
                        });
                        await recoveryManager.handleEvent('degenerate_predictions', { 
                            type: 'overconfident',
                            avgConfidence,
                            accuracy
                        });
                        return true;
                    }
                }

                // Check 4: Very low confidence variance (all predictions similar confidence)
                const minConf = Math.min(...res.rows.map(r => parseFloat(r.min_confidence)));
                const maxConf = Math.max(...res.rows.map(r => parseFloat(r.max_confidence)));
                if (maxConf - minConf < 0.05 && totalPredictions >= 20) {
                    logger.warn('[HealthMonitor] Degenerate predictions: uniform confidence', { 
                        minConf: minConf.toFixed(3),
                        maxConf: maxConf.toFixed(3),
                        count: totalPredictions
                    });
                    await recoveryManager.handleEvent('degenerate_predictions', { 
                        type: 'uniform_confidence',
                        minConf,
                        maxConf,
                        count: totalPredictions
                    });
                    return true;
                }
            }

            // Also check if weights are zero (which causes degenerate predictions)
            const weightManager = require('../predictor/WeightManager');
            const weights = weightManager.getAllWeights();
            const internalWeightsZero = ['outcome_internal', 'btts_internal', 'ou_internal'].every(w => weights[w] === 0);
            if (internalWeightsZero) {
                logger.warn('[HealthMonitor] Internal weights are zero, triggering recovery');
                await recoveryManager.handleEvent('weights_zero', { weights });
                return true;
            }

            return false;
        } catch (err) {
            logger.error('[HealthMonitor] Degenerate prediction check failed', { error: err.message });
            return false;
        }
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
            logger.error(`[HealthMonitor] Accuracy calculation failed: ${err.message}`);
            return null;
        }
    }

    async checkSystemHealth() {
        try {
            // 0. Prediction Drift Check
            await this.checkPredictionDrift();

            // 0b. Degenerate Predictions Check
            await this.checkDegeneratePredictions();

            // 1. Memory Check
            const ramUsage = process.memoryUsage().heapUsed / 1024 / 1024;

            // 2. DB Latency Check
            const start = Date.now();
            await db.query('SELECT 1');
            const dbLatency = Date.now() - start;

            // 3. API Error Rate
            const errorRate = this.apiErrorCount;
            this.apiErrorCount = 0; // Reset for next window

            logger.info(`[HealthMonitor] Health Check: RAM=${ramUsage.toFixed(1)}MB, DB=${dbLatency}ms, APIErrors=${errorRate}`);

            if (ramUsage > 800 || dbLatency > 200 || errorRate > 10) {
                this.setState('CRITICAL');
            } else if (ramUsage > 500 || dbLatency > 50 || errorRate > 3) {
                this.setState('DEGRADED');
            } else {
                this.setState('HEALTHY');
            }
        } catch (err) {
            logger.error(`[HealthMonitor] Health check failed: ${err.message}`);
            this.setState('CRITICAL');
            await recoveryManager.handleEvent('db_connection_lost', { error: err.message });
        }

        // Trigger recalibration if the state was set to RECALIBRATING during drift check
        if (this.state === 'RECALIBRATING') {
            await recalibrationService.recalibrate();
        }
    }
}

module.exports = new HealthMonitor();
