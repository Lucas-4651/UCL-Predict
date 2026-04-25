const express = require('express');
const router = express.Router();
const AdminAuthService = require('../services/auth/AdminAuthService');

router.get('/login', (req, res) => {
    res.render('admin/login', { error: null });
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const admin = await AdminAuthService.authenticate(email, password);
        if (admin) {
            req.session.adminId = admin.id;
            req.session.adminEmail = admin.email;
            return res.redirect('/admin');
        }
        res.render('admin/login', { error: 'Identifiants invalides' });
    } catch (err) {
        res.status(500).send(`Erreur serveur: ${err.message}`);
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Erreur lors de la déconnexion');
        }
        res.redirect('/admin/login');
    });
});

module.exports = router;
