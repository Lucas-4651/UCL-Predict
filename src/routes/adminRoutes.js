const express = require('express');
const router = express.Router();
const { isAdminAuthenticated } = require('../middleware/adminAuthMiddleware');
const healthMonitor = require('../services/healing/HealthMonitor');
const weightManager = require('../services/predictor/WeightManager');
const dbService = require('../services/dbService');
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const os = require('os');
const learningService = require('../services/healing/LearningService');
const leagueIntelligence = require('../services/intelligence/LeagueIntelligenceService');
const chatService = require('../services/chatService');

router.get('/', isAdminAuthenticated, async (req, res) => {

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

// User Management CRUD
router.get('/users', isAdminAuthenticated, async (req, res) => {
    try {
        const users = await dbService.getAllUsers();
        res.render('admin/users', { users });
    } catch (err) {
        res.status(500).send(`Error: ${err.message}`);
    }
});

router.get('/users/new', isAdminAuthenticated, (req, res) => {
    res.render('admin/user-form', { user: null, action: 'Créer' });
});

router.post('/users/create', isAdminAuthenticated, async (req, res) => {
    const { email, password, role } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await dbService.createUser(email, hashedPassword, role);
        res.redirect('/admin/users');
    } catch (err) {
        res.status(500).send(`Error: ${err.message}`);
    }
});

router.get('/users/edit/:id', isAdminAuthenticated, async (req, res) => {
    try {
        const user = await dbService.findUserById(req.params.id);
        if (!user) return res.status(404).send('Utilisateur non trouvé');
        res.render('admin/user-form', { user, action: 'Modifier' });
    } catch (err) {
        res.status(500).send(`Error: ${err.message}`);
    }
});

router.post('/users/update/:id', isAdminAuthenticated, async (req, res) => {
    const { role, password } = req.body;
    try {
        if (role) {
            await dbService.updateUserRole(req.params.id, role);
        }
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            // Need a method in dbService to update password
            await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.params.id]);
        }
        res.redirect('/admin/users');
    } catch (err) {
        res.status(500).send(`Error: ${err.message}`);
    }
});

router.get('/learn', isAdminAuthenticated, (req, res) => {
    res.render('admin/learn');
});

router.post('/learn', isAdminAuthenticated, async (req, res) => {

    try {
        const result = await learningService.processMatchResult(req.body);
        res.json({
            success: true,
            message: 'Intelligence updated successfully',
            details: result
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

router.get('/intelligence', isAdminAuthenticated, (req, res) => {
    try {
        const report = leagueIntelligence.getFullIntelligenceReport();
        res.render('admin/intelligence', { report });
    } catch (err) {
        res.status(500).send(`Error: ${err.message}`);
    }
});

// Chat Admin API
router.post('/api/chat/broadcast', isAdminAuthenticated, async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) return res.status(400).json({ error: 'Content is required' });

        // Broadcasts are sent by the system/admin
        const message = await chatService.sendMessage(null, content, 'broadcast');
        res.json(message);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/api/chat/moderate/:id', isAdminAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body; // 'pin' or 'delete'

        let updates = {};
        if (action === 'pin') updates = { is_pinned: true };
        else if (action === 'unpin') updates = { is_pinned: false };
        else if (action === 'delete') updates = { is_deleted: true };
        else return res.status(400).json({ error: 'Invalid action' });

        const message = await chatService.moderateMessage(id, updates);
        res.json(message);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

