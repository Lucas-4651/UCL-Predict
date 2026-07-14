module.exports = {
    testEnvironment: 'node',
    // Integration tests that hit real external services (e.g. the Sporty API)
    // are kept out of the default run so `npm test` stays deterministic and fast.
    testPathIgnorePatterns: ['/node_modules/', '/tests/integration/'],
    testMatch: ['**/tests/**/*.test.js'],
    // The unit tests open a real pg connection pool (singleton) that Jest cannot
    // tear down on its own, which would otherwise force-exit the worker and
    // corrupt shared singleton state (e.g. HealthMonitor) across test files.
    forceExit: true,
    testTimeout: 30000,
    verbose: true,
};

