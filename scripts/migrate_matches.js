const db = require('./src/config/database');

async function migrate() {
    console.log('Running migration: Create match_history table...');
    const sql = `
        CREATE TABLE IF NOT EXISTS match_history (
            id SERIAL PRIMARY KEY,
            match_external_id TEXT UNIQUE,
            home_team TEXT,
            away_team TEXT,
            home_goals INTEGER,
            away_goals INTEGER,
            goals_json JSONB,
            round INTEGER,
            captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;
    try {
        await db.query(sql);
        console.log('Migration successful: match_history table is ready.');
    } catch (error) {
        console.error('Migration failed:', error.message);
    } finally {
        await db.close();
    }
}

migrate();
