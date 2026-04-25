function isAdminAuthenticated(req, res, next) {
    if (req.session && req.session.adminId) {
        return next();
    }
    res.redirect('/admin/login');
}

module.exports = {
    isAdminAuthenticated
};
