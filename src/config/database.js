const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    max: 20,
    connectionTimeoutMillis: 60000,
    idleTimeoutMillis: 10000,
    keepAlive: true,
    application_name: 'ucl-predict'
});

// Track DB health
let dbHealthy = true;
let lastHealthCheck = 0;

pool.on('error', (err) => {
    console.error('⚠️ Pool idle connection error (logged, server kept alive):', err.code || err.message);
    dbHealthy = false;
});

// Unified query method
const db = {
    async query(text, params) {
        const start = Date.now();
        try {
            const res = await pool.query(text, params);
            const duration = Date.now() - start;
            dbHealthy = true;
            return res;
        } catch (err) {
            console.error('Database query error:', err);
            dbHealthy = false;
            throw err;
        }
    },
    async close() {
        await pool.end();
    },
    getPool() {
        return pool;
    },
    isHealthy() {
        return dbHealthy;
    },
    async checkHealth() {
        // Quick health check with short timeout
        try {
            await pool.query('SELECT 1');
            dbHealthy = true;
            return true;
        } catch (err) {
            dbHealthy = false;
            return false;
        }
    }
};

module.exports = { ...db, pool };