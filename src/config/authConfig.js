module.exports = {
    SESSION_SECRET: process.env.SESSION_SECRET || 'vfl-super-secret-key-2026',
    ROLES: {
        ADMIN: 'admin',
        USER: 'user'
    },
    COOKIE_OPTIONS: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
};
