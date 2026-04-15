const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Required for Neon/many cloud providers
    }
});

// Unified query method to replace db.run, db.get, db.all
const db = {
    async query(text, params) {
        const start = Date.now();
        try {
            const res = await pool.query(text, params);
            const duration = Date.now() - start;
            // console.log('Executed query', { text, duration, rows: res.rowCount });
            return res;
        } catch (err) {
            console.error('Database query error:', err);
            throw err;
        }
    },
    async close() {
        await pool.end();
    }
};

module.exports = { ...db, pool };
