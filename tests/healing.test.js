const apiRecovery = require('../src/services/healing/ApiRecoveryService');
const healthMonitor = require('../src/services/healing/HealthMonitor');

describe('HealingSystem', () => {
    test('ApiRecovery should rotate identity on 403 error', async () => {
        const identityBefore = apiRecovery.getCurrentIdentity();

        const failingFn = async () => {
            const err = new Error('Forbidden');
            err.response = { status: 403 };
            throw err;
        };

        try {
            await apiRecovery.executeWithRetry(failingFn, 2);
        } catch (e) {
            // Expected to fail after 2 attempts
        }

        const identityAfter = apiRecovery.getCurrentIdentity();
        expect(identityAfter.userAgent).not.toBe(identityBefore.userAgent);
    });

    test('HealthMonitor should transition to DEGRADED on multiple API errors', async () => {
        healthMonitor.setState('HEALTHY');

        // Simulate several errors
        for(let i = 0; i < 5; i++) {
            healthMonitor.reportApiError();
        }

        await healthMonitor.checkSystemHealth();
        expect(healthMonitor.getState()).toBe('DEGRADED');
    });

    test('HealthMonitor should transition to CRITICAL on extreme API errors', async () => {
        healthMonitor.setState('HEALTHY');

        // Simulate massive errors
        for(let i = 0; i < 15; i++) {
            healthMonitor.reportApiError();
        }

        await healthMonitor.checkSystemHealth();
        expect(healthMonitor.getState()).toBe('CRITICAL');
    });
});
