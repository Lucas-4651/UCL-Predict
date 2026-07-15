function isAuthenticated(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    res.redirect('/auth/login');
}

// Hybrid guard for the community chat: accepts BOTH regular logged-in users
// (req.session.user) and admins (req.session.adminId), since the same chat
// widget is shared across the user and admin layouts. Resolves a unified
// identity on req.chatUser so handlers don't care which session type sent it.
function isChatAuthenticated(req, res, next) {
    if (req.session && req.session.user && req.session.user.id) {
        req.chatUser = {
            id: req.session.user.id,
            username: req.session.user.username || 'Utilisateur',
            isAdmin: req.session.user.role === 'admin',
        };
        return next();
    }
    if (req.session && req.session.adminId) {
        req.chatUser = {
            id: req.session.adminId,
            username: req.session.adminEmail || 'Admin',
            isAdmin: true,
        };
        return next();
    }
    // API call (fetch/EventSource) expects JSON, not an HTML redirect.
    res.status(401).json({ error: 'Non authentifié' });
}

module.exports = {
    isAuthenticated,
    isChatAuthenticated
};
