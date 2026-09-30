const { Pool } = require('pg');
require('dotenv').config();

let pool = null;
let isReconnecting = false;

function createPool() {
    const newPool = new Pool({
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

    newPool.on('error', (err) => {
        console.error('⚠️ Pool idle connection error:', err.code || err.message);
    });

    return newPool;
}

function initPool() {
    pool = createPool();
    return pool;
}

async function reconnectPool(maxRetries = 5, retryDelayMs = 5000) {
    if (isReconnecting) {
        console.log('[DB] Reconnection already in progress, waiting...');
        // Wait for existing reconnection to complete
        let attempts = 0;
        while (isReconnecting && attempts < maxRetries) {
            await new Promise(r => setTimeout(r, 1000));
            attempts++;
        }
        return pool;
    }

    isReconnecting = true;
    console.log('[DB] Starting pool reconnection...');

    try {
        if (pool) {
            await pool.end().catch(() => {});
        }
    } catch (err) {
        console.warn('[DB] Error closing old pool:', err.message);
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`[DB] Reconnection attempt ${attempt}/${maxRetries}...`);
            pool = createPool();
            // Test the connection
            await pool.query('SELECT 1');
            console.log('[DB] Reconnection successful!');
            isReconnecting = false;
            return pool;
        } catch (err) {
            console.error(`[DB] Reconnection attempt ${attempt} failed:`, err.message);
            if (attempt < maxRetries) {
                await new Promise(r => setTimeout(r, retryDelayMs));
            }
        }
    }

    isReconnecting = false;
    throw new Error('Failed to reconnect to database after maximum retries');
}

// Initialize pool on module load
initPool();

// Unified query method with automatic reconnection
const db = {
    async query(text, params) {
        const start = Date.now();
        try {
            const res = await pool.query(text, params);
            const duration = Date.now() - start;
            return res;
        } catch (err) {
            console.error('Database query error:', err);
            // If it's a connection error, trigger reconnection
            if (err.code === 'ETIMEDOUT' || err.code === 'ENETUNREACH' || err.code === 'ECONNRESET' || err.code === '57P01') {
                console.warn('[DB] Connection error detected, attempting reconnection...');
                try {
                    await reconnectPool();
                    // Retry the query once after reconnection
                    const res = await pool.query(text, params);
                    const duration = Date.now() - start;
                    return res;
                } catch (reconnectErr) {
                    console.error('[DB] Reconnection failed, query cannot be retried');
                    throw reconnectErr;
                }
            }
            throw err;
        }
    },
    async close() {
        await pool.end();
    },
    async reconnect() {
        return await reconnectPool();
    },
    getPool() {
        return pool;
    },
    isReconnecting() {
        return isReconnecting;
    }
};

module.exports = { ...db, pool };
