const express = require('express');
const path = require('path');
const { initDb } = require('./src/config/dbInit');
const userRoutes = require('./src/routes/userRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const healthMonitor = require('./src/services/healing/HealthMonitor');
const memoryRecovery = require('./src/services/healing/MemoryRecoveryService');
const driftDetector = require('./src/services/drift/DriftDetector');
const metricsService = require('./src/services/monitoring/MetricsService');

async function startServer() {
    let dbAvailable = true;
    let pool = null;

    // Try to initialize DB with timeout
    try {
        console.log('[Startup] Initializing database...');
        const initPromise = initDb();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('DB init timeout after 30s')), 30000)
        );
        await Promise.race([initPromise, timeoutPromise]);
        pool = require('./src/config/database').getPool();
        console.log('✅ Database initialized successfully');
    } catch (err) {
        console.error('⚠️ Database unavailable, starting in DEGRADED mode:', err.message);
        dbAvailable = false;
        healthMonitor.setState('DEGRADED');
    }

    const app = express();
    const PORT = process.env.PORT || 3000;

    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'src/views'));

    // Middleware
    const session = require('express-session');
    const authConfig = require('./src/config/authConfig');

    app.set('trust proxy', 1);

    // Metrics middleware (before other middleware)
    app.use(metricsService.httpMetricsMiddleware());

    // Session store - use DB if available, else memory store
    let sessionStore;
    if (dbAvailable) {
        const pgSession = require('connect-pg-simple')(session);
        const db = require('./src/config/database');
        sessionStore = new pgSession({
            pool: db.pool,
            tableName: 'sessions_v2'
        });
    } else {
        console.log('[Startup] Using in-memory session store (degraded mode)');
        sessionStore = new session.MemoryStore();
    }

    app.use(session({
        store: sessionStore,
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
    app.use('/admin', require('./src/routes/adminAuthRoutes'));
    app.use('/admin', adminRoutes);
    app.use('/', userRoutes);

    // Prometheus metrics endpoint (public, no auth required for scraping)
    app.get('/metrics', (req, res) => {
        res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
        res.send(metricsService.generatePrometheusOutput());
    });

    // Initialize Prediction Weights at startup to avoid lazy-loading timeouts during requests
    const weightManager = require('./src/services/predictor/WeightManager');
    try {
        await weightManager.init();
        console.log('✅ Prediction weights loaded successfully');
    } catch (err) {
        console.error('⚠️ Failed to load prediction weights:', err);
        // WeightManager will fallback to cache or defaults internally
    }

    // Initialize League Intelligence Service
    const intelligenceService = require('./src/services/intelligence/LeagueIntelligenceService');
    try {
        await intelligenceService.init();
    } catch (err) {
        console.error('⚠️ Failed to load league intelligence:', err);
    }

    // Initialize Drift Detector
    try {
        driftDetector.start(3600000); // check every hour
        console.log('🔍 Drift Detector started');
    } catch (err) {
        console.error('⚠️ Failed to start Drift Detector:', err);
    }

    // Background DB reconnection attempt if initially unavailable
    if (!dbAvailable) {
        console.log('[Startup] Starting background DB reconnection attempts...');
        const attemptReconnect = async () => {
            while (!dbAvailable) {
                try {
                    console.log('[Background] Attempting DB reconnection...');
                    await require('./src/config/database').reconnect(3, 10000);
                    dbAvailable = true;
                    pool = require('./src/config/database').getPool();
                    healthMonitor.setState('HEALTHY');
                    console.log('✅ Database reconnected! Switching session store...');
                    // Note: Session store cannot be hot-swapped easily, would need restart for full functionality
                    break;
                } catch (err) {
                    console.log('[Background] Reconnection failed, retrying in 30s...');
                    await new Promise(r => setTimeout(r, 30000));
                }
            }
        };
        attemptReconnect();
    }

    // Health & Maintenance Loop
    setInterval(async () => {
        try {
            await healthMonitor.checkSystemHealth();
            await memoryRecovery.checkAndRecover();
        } catch (err) {
            console.error('[HealthLoop] Error:', err.message);
        }
    }, 60000);

    // Pre-compute R+1 prediction job.
    // Polls every 15s: as soon as the next round (R+1) appears populated in
    // the Sporty API, its predictions are computed and cached in Postgres so
    // clients can read them instantly via /predictions/api/round/:n (SSE
    // round-ready triggers the auto-refresh). This gives clients the full
    // betting window before the round opens.
    const cacheService = require('./src/services/predictor/CachePredictionService');
    const db = require('./src/config/database');
    let lastComputedRound = 0;
    const precomputeTimer = setInterval(async () => {
        // Check DB health before running pre-compute
        const healthy = await db.checkHealth();
        if (!healthy) return; // Skip if DB unavailable
        try {
            const next = await cacheService.computeAndCacheNextRound(lastComputedRound);
            if (next && next !== lastComputedRound) {
                lastComputedRound = next;
                console.log(`🔮 Pre-computed round ${next} (R+1) → cache ready`);
            }
        } catch (err) {
            console.error('⚠️ Pre-compute R+1 failed:', err.message);
        }
    }, 15000);
    if (precomputeTimer.unref) precomputeTimer.unref();

    app.listen(PORT, async () => {
        const healthy = await db.checkHealth();
        const mode = healthy ? 'NORMAL' : 'DEGRADED (DB unavailable)';
        console.log(`🚀 UCL-Predict running on http://localhost:${PORT} [${mode}]`);
        console.log(`🛠️ Admin Dashboard: http://localhost:${PORT}/admin`);
        console.log(`📊 Metrics: http://localhost:${PORT}/metrics`);
    });
}

startServer();
