const healthMonitor = require('./HealthMonitor');
const logger = require('./Logger');
const settings = require('../../config/settings');

class ApiRecoveryService {
    constructor() {
        this.userAgents = [
            'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
            'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
            'Mozilla/5.0 (Linux; Android 12; Samsung SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
            'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36'
        ];
        this.appVersions = ['27869', '27870', '27871', '27872'];
        this.currentIndex = 0;
        
        // Circuit breaker state
        this.circuitState = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailureTime = null;
        this.circuitOpenTime = null;
        
        // Configurable thresholds
        this.failureThreshold = 5; // failures before opening circuit
        this.successThreshold = 3; // successes in HALF_OPEN before closing
        this.circuitTimeout = 60000; // 60 seconds before trying HALF_OPEN
    }

    getCurrentIdentity() {
        return {
            userAgent: this.userAgents[this.currentIndex],
            appVersion: this.appVersions[this.currentIndex]
        };
    }

    rotateIdentity() {
        this.currentIndex = (this.currentIndex + 1) % this.userAgents.length;
        logger.info(`[ApiRecovery] Identity rotated. New index: ${this.currentIndex}`);
        return this.getCurrentIdentity();
    }

    recordFailure() {
        this.failureCount++;
        this.successCount = 0;
        this.lastFailureTime = Date.now();
        
        if (this.circuitState === 'CLOSED' && this.failureCount >= this.failureThreshold) {
            this.openCircuit();
        } else if (this.circuitState === 'HALF_OPEN') {
            this.openCircuit();
        }
    }

    recordSuccess() {
        this.failureCount = 0;
        this.successCount++;
        
        if (this.circuitState === 'HALF_OPEN' && this.successCount >= this.successThreshold) {
            this.closeCircuit();
        }
    }

    openCircuit() {
        if (this.circuitState !== 'OPEN') {
            logger.warn('[ApiRecovery] Circuit breaker OPENED - API calls will fail fast');
            this.circuitState = 'OPEN';
            this.circuitOpenTime = Date.now();
            // Notify health monitor
            healthMonitor.setState('DEGRADED');
        }
    }

    closeCircuit() {
        if (this.circuitState !== 'CLOSED') {
            logger.info('[ApiRecovery] Circuit breaker CLOSED - API calls resumed');
            this.circuitState = 'CLOSED';
            this.failureCount = 0;
            this.successCount = 0;
            this.circuitOpenTime = null;
            healthMonitor.setState('HEALTHY');
        }
    }

    checkCircuit() {
        if (this.circuitState === 'OPEN') {
            if (Date.now() - this.circuitOpenTime >= this.circuitTimeout) {
                logger.info('[ApiRecovery] Circuit breaker entering HALF_OPEN state');
                this.circuitState = 'HALF_OPEN';
                this.successCount = 0;
                return true; // Allow one request through
            }
            return false; // Circuit still open, fail fast
        }
        return true; // CLOSED or HALF_OPEN, allow request
    }

    getCircuitState() {
        return {
            state: this.circuitState,
            failureCount: this.failureCount,
            successCount: this.successCount,
            lastFailureTime: this.lastFailureTime,
            circuitOpenTime: this.circuitOpenTime
        };
    }

    async executeWithRetry(fn, maxRetries = 3) {
        // Check circuit breaker before attempting
        if (!this.checkCircuit()) {
            const err = new Error('Circuit breaker OPEN - failing fast');
            err.circuitOpen = true;
            throw err;
        }

        let attempt = 0;
        while (attempt < maxRetries) {
            try {
                const result = await fn();
                this.recordSuccess();
                return result;
            } catch (err) {
                attempt++;
                healthMonitor.reportApiError();
                this.recordFailure();

                if (attempt >= maxRetries) throw err;

                // Check if it's a block error (403, 429) or a network timeout/unreachability
                const isBlock = err.response && (err.response.status === 403 || err.response.status === 429);
                const isNetworkError = !err.response && (err.code === 'ETIMEDOUT' || err.code === 'ENETUNREACH');

                if (isBlock || isNetworkError) {
                    logger.warn(`[ApiRecovery] Block or Network issue detected (${err.code || err.response?.status}). Rotating identity...`);
                    this.rotateIdentity();
                }

                const delay = Math.pow(2, attempt) * 1000;
                logger.info(`[ApiRecovery] Attempt ${attempt} failed. Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
}

module.exports = new ApiRecoveryService();
