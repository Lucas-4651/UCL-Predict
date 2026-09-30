const db = require('../../config/database');
const settings = require('../../config/settings');
const weightManager = require('../predictor/WeightManager');
const learningLoop = require('../predictor/LearningLoop');

class DriftDetector {
    constructor() {
        this.isRunning = false;
        this.lastCheck = null;
        this.checkInterval = null;
    }

    start(intervalMs = 3600000) { // default 1 hour
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        this.checkInterval = setInterval(() => this.checkDrift(), intervalMs);
        this.checkInterval.unref(); // don't block process exit
        console.log('[DriftDetector] Started with interval', intervalMs, 'ms');
    }

    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    async checkDrift() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastCheck = new Date();

        try {
            if (process.env.DEBUG_WEIGHTS === '1') {
                console.log('[DriftDetector] Running drift check...');
            }

            const metrics = await this.computeMetrics();
            const driftDetected = this.evaluateDrift(metrics);

            if (driftDetected) {
                console.warn('[DriftDetector] DRIFT DETECTED:', metrics);
                await this.triggerRecovery(metrics);
            } else if (process.env.DEBUG_WEIGHTS === '1') {
                console.log('[DriftDetector] No drift. Metrics:', metrics);
            }

            // Store drift metrics for history
            await this.storeMetrics(metrics, driftDetected);

        } catch (err) {
            console.error('[DriftDetector] Error during drift check:', err.message);
        } finally {
            this.isRunning = false;
        }
    }

    async computeMetrics(windowSize = 50) {
        const res = await db.query(
            `SELECT predicted_probs, actual_outcome, actual_home_goals, actual_away_goals, confidence
             FROM predictions
             WHERE actual_outcome IS NOT NULL
             ORDER BY created_at DESC
             LIMIT $1`,
            [windowSize]
        );

        const rows = res.rows;
        if (rows.length === 0) {
            return { sampleSize: 0, brierScore: null, hitRate: null, calibrationError: null };
        }

        // Compute Brier score (multi-class for outcome, binary for BTTS/OU)
        let totalBrier = 0;
        let totalHit = 0;
        let calibrationSum = 0;
        let calibrationCount = 0;

        for (const row of rows) {
            const probs = row.predicted_probs;
            if (!probs) continue;

            // Outcome market (multi-class)
            if (probs.outcome) {
                let brier = 0;
                const classes = ['1', 'X', '2'];
                for (const c of classes) {
                    const p = probs.outcome[c] || 0;
                    const y = (c === row.actual_outcome) ? 1 : 0;
                    brier += Math.pow(p - y, 2);
                }
                totalBrier += brier;

                // Hit rate: predicted outcome matches actual
                const predOutcome = Object.entries(probs.outcome).reduce((a, b) => a[1] > b[1] ? a : b)[0];
                if (predOutcome === row.actual_outcome) totalHit++;

                // Calibration: confidence of predicted class vs accuracy
                const confidence = probs.outcome[predOutcome] || 0;
                calibrationSum += Math.abs(confidence - (predOutcome === row.actual_outcome ? 1 : 0));
                calibrationCount++;
            }

            // BTTS market (binary)
            if (probs.btts && row.actual_home_goals !== null && row.actual_away_goals !== null) {
                const actualBTTS = (row.actual_home_goals > 0 && row.actual_away_goals > 0) ? 1 : 0;
                const predProb = probs.btts['Yes'] || 0;
                totalBrier += Math.pow(predProb - actualBTTS, 2);

                const predClass = predProb > 0.5 ? 1 : 0;
                if (predClass === actualBTTS) totalHit++;
                calibrationSum += Math.abs(predProb - actualBTTS);
                calibrationCount++;
            }

            // OU market (binary)
            if (probs.ou && row.actual_home_goals !== null && row.actual_away_goals !== null) {
                const totalGoals = row.actual_home_goals + row.actual_away_goals;
                const actualOU = (totalGoals > 2.5) ? 1 : 0;
                const predProb = probs.ou['Over'] || 0;
                totalBrier += Math.pow(predProb - actualOU, 2);

                const predClass = predProb > 0.5 ? 1 : 0;
                if (predClass === actualOU) totalHit++;
                calibrationSum += Math.abs(predProb - actualOU);
                calibrationCount++;
            }
        }

        const sampleSize = rows.length;
        const brierScore = sampleSize > 0 ? totalBrier / sampleSize : null;
        const hitRate = sampleSize > 0 ? totalHit / sampleSize : null;
        const calibrationError = calibrationCount > 0 ? calibrationSum / calibrationCount : null;

        return {
            sampleSize,
            brierScore,
            hitRate,
            calibrationError,
            timestamp: new Date()
        };
    }

    evaluateDrift(metrics) {
        if (metrics.sampleSize < 20) {
            return false; // not enough data
        }

        // Thresholds (configurable via settings later)
        const BRIER_THRESHOLD = 0.30; // high Brier = poor calibration
        const HIT_RATE_THRESHOLD = 0.35; // low hit rate = poor discrimination
        const CALIBRATION_THRESHOLD = 0.25; // high calibration error

        const driftSignals = [];

        if (metrics.brierScore !== null && metrics.brierScore > BRIER_THRESHOLD) {
            driftSignals.push(`Brier score ${metrics.brierScore.toFixed(3)} > ${BRIER_THRESHOLD}`);
        }
        if (metrics.hitRate !== null && metrics.hitRate < HIT_RATE_THRESHOLD) {
            driftSignals.push(`Hit rate ${metrics.hitRate.toFixed(3)} < ${HIT_RATE_THRESHOLD}`);
        }
        if (metrics.calibrationError !== null && metrics.calibrationError > CALIBRATION_THRESHOLD) {
            driftSignals.push(`Calibration error ${metrics.calibrationError.toFixed(3)} > ${CALIBRATION_THRESHOLD}`);
        }

        if (driftSignals.length > 0) {
            metrics.driftSignals = driftSignals;
            return true;
        }
        return false;
    }

    async triggerRecovery(metrics) {
        console.log('[DriftDetector] Triggering recovery actions...');

        try {
            // 1. Log the event
            await this.logHealingEvent('drift_detected', 'WARNING', `Drift detected: ${metrics.driftSignals.join(', ')}`);

            // 2. Option A: Reset weights to defaults (conservative)
            // await weightManager.resetWeights();

            // 3. Option B: Recalibrate using recent data (more sophisticated)
            // For now, we'll just reset to defaults as a safe fallback.
            // In future, we could retrain on recent window.
            await weightManager.resetWeights();

            // 4. Reset learning velocity
            learningLoop.velocity = {};
            learningLoop.saveVelocity();

            // 5. Log recovery
            await this.logHealingEvent('weights_reset', 'INFO', 'Weights reset to defaults due to drift');

        } catch (err) {
            console.error('[DriftDetector] Recovery failed:', err.message);
            await this.logHealingEvent('recovery_failed', 'ERROR', err.message);
        }
    }

    async storeMetrics(metrics, driftDetected) {
        try {
            await db.query(
                `INSERT INTO drift_metrics (accuracy, window_size, brier_score, hit_rate, calibration_error, drift_detected, signals, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
                [
                    metrics.hitRate || 0,
                    metrics.sampleSize,
                    metrics.brierScore || 0,
                    metrics.hitRate || 0,
                    metrics.calibrationError || 0,
                    driftDetected,
                    metrics.driftSignals ? JSON.stringify(metrics.driftSignals) : null
                ]
            );
        } catch (err) {
            console.error('[DriftDetector] Failed to store metrics:', err.message);
        }
    }

    async logHealingEvent(event, severity, message) {
        try {
            await db.query(
                `INSERT INTO healing_logs (service, event, severity, message, created_at)
                 VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
                ['DriftDetector', event, severity, message]
            );
        } catch (err) {
            console.error('[DriftDetector] Failed to log healing event:', err.message);
        }
    }

    // Manual trigger for admin/testing
    async manualCheck() {
        await this.checkDrift();
        const metrics = await this.computeMetrics();
        return { metrics, driftDetected: this.evaluateDrift(metrics) };
    }
}

module.exports = new DriftDetector();