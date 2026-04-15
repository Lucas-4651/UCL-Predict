const express = require('express');
const router = express.Router();
const { isAuthenticated, isAdmin } = require('../middleware/authMiddleware');
const healthMonitor = require('../services/healing/HealthMonitor');
const weightManager = require('../services/predictor/WeightManager');
const os = require('os');

router.get('/', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const accuracy = await healthMonitor.getRollingAccuracy();
        const ram = process.memoryUsage().heapUsed / 1024 / 1024;
        const weights = await weightManager.getAllWeights();

        res.render('admin', {
            state: healthMonitor.getState(),
            accuracy: accuracy ? (accuracy * 100).toFixed(2) + '%' : 'N/A',
            ram: ram.toFixed(2) + ' MB',
            uptime: (process.uptime()).toFixed(0) + 's',
            systemRam: (os.totalmem() / 1024 / 1024 / 1024).toFixed(2) + ' GB',
            weights: weights
        });
    } catch (err) {
        res.status(500).send(`Error: ${err.message}`);
    }
});

module.exports = router;
