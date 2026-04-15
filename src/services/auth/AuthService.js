const jwt = require('jsonwebtoken');
const settings = require('../../config/settings');

const SECRET = process.env.JWT_SECRET || 'vfl-secret-key-2026';

class AuthService {
    generateToken(user) {
        return jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '24h' });
    }

    verifyToken(token) {
        try {
            return jwt.verify(token, SECRET);
        } catch (err) {
            return null;
        }
    }

    // Simplified for now: returns a dummy user
    async login(username, password) {
        if (username === 'admin' && password === 'admin') {
            return { id: 1, username: 'admin', role: 'admin' };
        }
        return null;
    }
}

module.exports = new AuthService();
