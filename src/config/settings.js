module.exports = {
    LEAGUE_ID: 8056,
    LEAGUE_NAME: 'Champions League',
    CURRENT_SEASON: '2026',
    API_BASE_URL: 'https://hg-event-api-prod.sporty-tech.net/api/instantleagues',
    LEARNING_RATE: 0.01,
    LEARNING_DECAY: 0.001,
    MOMENTUM: 0.9,
    L2_REGULARIZATION: 0.0001,
    VALIDATION_WINDOW: 50, // number of recent predictions to validate on
    MIN_IMPROVEMENT: 0.001, // minimum Brier score improvement to accept new weights
    DRIFT_THRESHOLD: 0.65, // Accuracy below 65% triggers recalibration
    // Drift detection thresholds
    DRIFT_BRIER_THRESHOLD: 0.30,
    DRIFT_HIT_RATE_THRESHOLD: 0.35,
    DRIFT_CALIBRATION_THRESHOLD: 0.25,
    DRIFT_MIN_SAMPLES: 20,
    POLLING_INTERVAL: 120000, // 2 minutes (though predictions are now on-demand)
};
