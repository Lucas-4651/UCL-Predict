module.exports = {
    SESSION_SECRET: process.env.SESSION_SECRET || 'ucl-predict-super-secret-key-2026',
    COOKIE_OPTIONS: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
};
