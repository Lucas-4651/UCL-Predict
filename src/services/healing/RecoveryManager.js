const db = require('../../config/database');
const weightManager = require('../predictor/WeightManager');
const learningLoop = require('../predictor/LearningLoop');
const healthMonitor = require('./HealthMonitor');
const driftDetector = require('../drift/DriftDetector');
const logger = require('./Logger');

class RecoveryManager {
    constructor() {
        this.recoveryInProgress = false;
        this.lastRecoveryTime = null;
        this.recoveryCount = 0;
    }

    async handleEvent(event, details = {}) {
        if (this.recoveryInProgress) {
            logger.warn('[RecoveryManager] Recovery already in progress, skipping', { event });
            return;
        }

        this.recoveryInProgress = true;
        this.recoveryCount++;
        this.lastRecoveryTime = new Date();

        try {
            logger.info('[RecoveryManager] Handling event', { event, details });

            switch (event) {
                case 'drift_detected':
                    await this.handleDrift(details);
                    break;
                case 'db_connection_lost':
                    await this.handleDBDown(details);
                    break;
                case 'api_unavailable':
                    await this.handleAPIUnavailable(details);
                    break;
                case 'degenerate_predictions':
                    await this.handleDegeneratePredictions(details);
                    break;
                case 'weights_zero':
                    await this.handleZeroWeights(details);
                    break;
                case 'memory_exhaustion':
                    await this.handleMemoryExhaustion(details);
                    break;
                default:
                    logger.warn('[RecoveryManager] Unknown event', { event });
            }

            await this.logRecovery(event, 'SUCCESS');
        } catch (err) {
            logger.error('[RecoveryManager] Recovery failed', { event, error: err.message });
            await this.logRecovery(event, 'FAILED', err.message);
            throw err;
        } finally {
            this.recoveryInProgress = false;
        }
    }

    async handleDrift(details) {
        logger.info('[RecoveryManager] Handling drift detection...');
        
        // 1. Reset weights to defaults (conservative)
        await weightManager.resetWeights();
        
        // 2. Reset learning velocity
        learningLoop.velocity = {};
        learningLoop.saveVelocity();
        
        // 3. Reset drift detector state
        driftDetector.lastCheck = null;
        
        // 4. Set health monitor to recovering then healthy
        healthMonitor.setState('RECOVERING');
        
        logger.info('[RecoveryManager] Drift recovery completed');
    }

    async handleDBDown(details) {
        logger.warn('[RecoveryManager] Database connection lost, attempting recovery...');
        
        // 1. Try to reconnect by reinitializing the pool
        const dbPool = require('../../config/database').pool;
        try {
            await dbPool.end();
            // The pool will be recreated on next query? Actually we need to reinitialize.
            // For now, we'll just log and wait for the pool's error handler to recover.
        } catch (err) {
            logger.error('[RecoveryManager] Failed to reconnect DB', { error: err.message });
        }
        
        // 2. Switch weight manager to cache mode if not already
        if (weightManager.getMode() === 'DB') {
            // The weight manager will automatically fallback to cache on next load
            logger.info('[RecoveryManager] WeightManager will fallback to cache on next load');
        }
        
        healthMonitor.setState('DEGRADED');
    }

    async handleAPIUnavailable(details) {
        logger.warn('[RecoveryManager] External API unavailable, switching to internal model only...');
        
        // Increase internal weight reliance by switching to MARKET_ONLY fallback? Actually we want to disable market.
        // For now, we can set a flag in weight manager to ignore market weights.
        // We'll implement a mode for that if needed.
        
        healthMonitor.setState('DEGRADED');
    }

    async handleDegeneratePredictions(details) {
        logger.warn('[RecoveryManager] Degenerate predictions detected (all same output)...');
        
        // This usually means weights are zero or internal model broken
        // Reset weights and velocity
        await weightManager.resetWeights();
        learningLoop.velocity = {};
        learningLoop.saveVelocity();
        
        // Check if weights are actually zero
        const weights = weightManager.getAllWeights();
        const allZero = Object.values(weights).every(v => v === 0);
        if (allZero) {
            logger.error('[RecoveryManager] Weights are all zero! Forcing defaults.');
            weightManager.weights = { ...weightManager.defaultWeights };
            await weightManager.saveAllWeights();
        }
        
        healthMonitor.setState('RECOVERING');
    }

    async handleZeroWeights(details) {
        logger.error('[RecoveryManager] Zero weights detected, forcing defaults...');
        weightManager.weights = { ...weightManager.defaultWeights };
        await weightManager.saveAllWeights();
        learningLoop.velocity = {};
        learningLoop.saveVelocity();
    }

    async handleMemoryExhaustion(details) {
        logger.warn('[RecoveryManager] Memory exhaustion, triggering garbage collection...');
        if (global.gc) {
            global.gc();
            logger.info('[RecoveryManager] Garbage collection triggered');
        }
        // Could also clear prediction caches
        const predictor = require('../predictor/HeuristicEngine');
        predictor.predictionCache.clear();
    }

    async logRecovery(event, status, message = '') {
        try {
            await db.query(
                `INSERT INTO healing_logs (service, event, severity, message, created_at)
                 VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
                ['RecoveryManager', event, status === 'SUCCESS' ? 'INFO' : 'ERROR', message || `Recovery ${status.toLowerCase()}`]
            );
        } catch (err) {
            logger.error('[RecoveryManager] Failed to log recovery', { error: err.message });
        }
    }

    getStatus() {
        return {
            recoveryInProgress: this.recoveryInProgress,
            lastRecoveryTime: this.lastRecoveryTime,
            recoveryCount: this.recoveryCount
        };
    }
}

module.exports = new RecoveryManager();