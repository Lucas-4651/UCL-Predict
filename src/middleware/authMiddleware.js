const { ROLES } = require('../config/authConfig');

function isAuthenticated(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    res.redirect('/auth/login');
}

function isAdmin(req, res, next) {
    if (req.session && req.session.role === ROLES.ADMIN) {
        return next();
    }
    // Redirect to home if not admin, or an "Access Denied" page
    res.redirect('/');
}

module.exports = {
    isAuthenticated,
    isAdmin
};
