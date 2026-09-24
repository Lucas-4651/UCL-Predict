const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Required for Neon/many cloud providers
    },
    max: 20, // Limit maximum number of clients in the pool
    // Neon's serverless pooler suspends idle connections; the first query after
    // a pause triggers a "cold start" that can take several seconds. The default
    // 30s connect timeout is occasionally too tight when all pooled hosts are
    // asleep at once, surfacing as ETIMEDOUT. Bump it so the pooler has time to
    // wake up. keepAlive prevents intermediate proxies (Render/Neon) from
    // silently dropping long-lived idle sockets.
    connectionTimeoutMillis: 60000,
    idleTimeoutMillis: 10000,
    keepAlive: true,
    application_name: 'ucl-predict'
});

// Neon's serverless pooler silently drops idle sockets (ETIMEDOUT/ECONNRESET),
// which surfaces as an 'error' event on the underlying pg Client. pg-pool does
// NOT swallow these — if no listener is attached, Node re-throws them as an
// uncaught exception and kills the whole process. Swallowing here keeps the
// server alive; the query that owned the dead connection already failed in its
// own try/catch, so logging + continuing is the correct degradation.
pool.on('error', (err) => {
    console.error('⚠️ Pool idle connection error (recovered, server kept alive):', err.code || err.message);
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
