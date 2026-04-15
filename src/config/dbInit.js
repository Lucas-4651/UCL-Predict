const db = require('./database');

const TABLES = {
    weights: `
        CREATE TABLE IF NOT EXISTS weights (
            factor_name TEXT PRIMARY KEY,
            weight_value DOUBLE PRECISION NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )`,
    predictions: `
        CREATE TABLE IF NOT EXISTS predictions (
            id SERIAL PRIMARY KEY,
            match_id TEXT,
            home_team TEXT,
            away_team TEXT,
            predicted_outcome TEXT,
            actual_outcome TEXT,
            actual_home_goals INTEGER,
            actual_away_goals INTEGER,
            is_correct INTEGER DEFAULT 0,
            confidence DOUBLE PRECISION,
            lambda_home DOUBLE PRECISION,
            lambda_away DOUBLE PRECISION,
            prob_matrix JSONB,
            predicted_probs JSONB,
            brier_score DOUBLE PRECISION,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )`,
    drift_metrics: `
        CREATE TABLE IF NOT EXISTS drift_metrics (
            id SERIAL PRIMARY KEY,
            accuracy DOUBLE PRECISION,
            window_size INTEGER,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )`,
    healing_logs: `
        CREATE TABLE IF NOT EXISTS healing_logs (
            id SERIAL PRIMARY KEY,
            service TEXT,
            event TEXT,
            severity TEXT,
            message TEXT,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )`,
    health_snapshots: `
        CREATE TABLE IF NOT EXISTS health_snapshots (
            id SERIAL PRIMARY KEY,
            state TEXT,
            ram_usage DOUBLE PRECISION,
            uptime INTEGER,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )`,
    recalibration_history: `
        CREATE TABLE IF NOT EXISTS recalibration_history (
            id SERIAL PRIMARY KEY,
            reason TEXT,
            old_weights TEXT,
            new_weights TEXT,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )`,
    users: `
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )`
};

async function initDb() {
    try {
        for (const [name, sql] of Object.entries(TABLES)) {
            await db.query(sql);
        }
        console.log('PostgreSQL database schema initialized successfully');
    } catch (err) {
        console.error('Database initialization failed:', err);
        throw err;
    }
}

module.exports = { initDb };

if (require.main === module) {
    initDb()
        .then(() => console.log('DB Initialization Complete'))
        .catch(err => console.error('DB Initialization Failed:', err));
}
