module.exports = {
    LEAGUE_ID: 8056,
    LEAGUE_NAME: 'Champions League',
    API_BASE_URL: 'https://hg-event-api-prod.sporty-tech.net/api/instantleagues',
    LEARNING_RATE: 0.01,
    LEARNING_DECAY: 0.001,
    DRIFT_THRESHOLD: 0.65, // Accuracy below 65% triggers recalibration
    POLLING_INTERVAL: 120000, // 2 minutes (though predictions are now on-demand)
    DB_PATH: './vfl.db'
};
