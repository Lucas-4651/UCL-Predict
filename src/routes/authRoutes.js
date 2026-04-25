const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const dbService = require('../services/dbService');
const { ROLES } = require('../config/authConfig');

router.get('/login', (req, res) => {
    res.render('auth/login', { error: null });
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await dbService.findUserByEmail(email);
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.render('auth/login', { error: 'Identifiants invalides' });
        }

        req.session.userId = user.id;
        req.session.role = user.role;
        req.session.user = { email: user.email, role: user.role };

        res.redirect('/?success=Connexion réussie ! Bienvenue sur VFL.');
    } catch (err) {
        res.status(500).send(`Erreur serveur: ${err.message}`);
    }
});

router.get('/register', (req, res) => {
    res.render('auth/register', { error: null });
});

router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const existingUser = await dbService.findUserByEmail(email);
        if (existingUser) {
            return res.render('auth/register', { error: 'Cet email est déjà utilisé' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await dbService.createUser(username, email, hashedPassword);

        res.redirect('/auth/login?success=Compte créé avec succès ! Veuillez vous connecter.');
    } catch (err) {
        if (err.message.includes('unique constraint')) {
            return res.render('auth/register', { error: 'Ce pseudo est déjà utilisé' });
        }
        res.status(500).send(`Erreur serveur: ${err.message}`);
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).send('Erreur lors de la déconnexion');
        res.redirect('/auth/login');
    });
});

module.exports = router;
