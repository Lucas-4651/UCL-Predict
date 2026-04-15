const express = require('express');
const path = require('path');
const { initDb } = require('./src/config/dbInit');
const userRoutes = require('./src/routes/userRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const healthMonitor = require('./src/services/healing/HealthMonitor');
const memoryRecovery = require('./src/services/healing/MemoryRecoveryService');

async function startServer() {
    try {
        await initDb();

        const app = express();
        const PORT = process.env.PORT || 3000;

        app.set('view engine', 'ejs');
        app.set('views', path.join(__dirname, 'src/views'));

        // Middleware
        const session = require('express-session');
        const pgSession = require('connect-pg-simple')(session);
        const db = require('./src/config/database');
        const authConfig = require('./src/config/authConfig');

        app.set('trust proxy', 1);

        app.use(session({
            store: new pgSession({
                pool: db.pool,
                tableName: 'sessions_v2'
            }),
            secret: authConfig.SESSION_SECRET,
            resave: false,
            saveUninitialized: false,
            cookie: authConfig.COOKIE_OPTIONS
        }));

        // User context middleware
        app.use((req, res, next) => {
            res.locals.user = req.session.user || null;
            next();
        });

        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));
        app.use(express.static(path.join(__dirname, 'public')));

        // Routes
        app.use('/auth', require('./src/routes/authRoutes'));
        app.use('/', userRoutes);
        app.use('/admin', adminRoutes);

        // Health & Maintenance Loop
        setInterval(async () => {
            await healthMonitor.checkSystemHealth();
            await memoryRecovery.checkAndRecover();
        }, 60000);

        app.listen(PORT, () => {
            console.log(`🚀 VFL Autonomous Platform running on http://localhost:${PORT}`);
            console.log(`🛠️ Admin Dashboard: http://localhost:${PORT}/admin`);
        });
    } catch (err) {
        console.error('Critical failure during startup:', err);
        process.exit(1);
    }
}

startServer();
