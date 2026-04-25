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
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )`,
    admins: `
        CREATE TABLE IF NOT EXISTS admins (
            id SERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )`,
    messages: `
        CREATE TABLE IF NOT EXISTS messages (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            content TEXT NOT NULL,
            type TEXT CHECK (type IN ('broadcast', 'chat')) DEFAULT 'chat',
            is_pinned BOOLEAN DEFAULT false,
            is_deleted BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )`,
    session: `
        CREATE TABLE IF NOT EXISTS sessions_v2 (
            sid varchar PRIMARY KEY,
            sess text NOT NULL,
            expire timestamp(6) with time zone
        )`

};

async function initDb() {
    try {
        for (const [name, sql] of Object.entries(TABLES)) {
            await db.query(sql);
        }

        // Migration: Add username column to users table if it doesn't exist
        const userCols = await db.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'username'"
        );

        if (userCols.rowCount === 0) {
            console.log('Migrating users table: adding username column...');
            // 1. Add column as nullable first
            await db.query('ALTER TABLE users ADD COLUMN username TEXT');
            // 2. Fill existing users with a pseudo based on their email
            await db.query("UPDATE users SET username = split_part(email, '@', 1) WHERE username IS NULL");
            // 3. Set to NOT NULL and UNIQUE now that it's populated
            await db.query('ALTER TABLE users ALTER COLUMN username SET NOT NULL');
            await db.query('ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username)');
            console.log('Migration completed successfully.');
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
