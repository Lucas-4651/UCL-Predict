const db = require('../../config/database');
const fs = require('fs');
const path = require('path');

class WeightManager {
    constructor() {
        this.weights = {};
        this.initialized = false;
        this.mode = 'UNINITIALIZED'; // 'DB', 'CACHE', 'DEFAULTS', 'FALLBACK_MARKET_ONLY'
        this.cacheFile = path.join(process.cwd(), 'weights_cache.json');
        this.defaultWeights = {
            outcome_market: 0.5, outcome_internal: 0.5,
            btts_market: 0.5, btts_internal: 0.5,
            ou_market: 0.5, ou_internal: 0.5,
            outcome_ranking: 0.9, outcome_form: 0.7, outcome_bias: 0.3,
            outcome_threshold_high: 0.45, outcome_threshold_low: 0.35,
            btts_form: 0.6, btts_ranking: 0.4,
            ou_form: 0.7, ou_volatility: 0.3,
            draw_inflation: 1.2
        };
    }

    async init() {
        // Create table if not exists - mostly handled by dbInit.js but kept for robustness
        await db.query(`CREATE TABLE IF NOT EXISTS weights (
            factor_name TEXT PRIMARY KEY,
            weight_value DOUBLE PRECISION,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )`);

        await this.loadWeightsWithFallback();
        this.initialized = true;
        if (process.env.DEBUG_WEIGHTS === '1') {
            console.log('[WeightManager] Initialized in mode:', this.mode);
            console.log('[WeightManager] Weights:', JSON.stringify(this.weights, null, 2));
        }
    }

    async loadWeightsWithFallback() {
        // Try DB first
        try {
            await this.loadWeightsFromDB();
            this.mode = 'DB';
            this.writeCache();
            return;
        } catch (err) {
            console.warn('[WeightManager] DB load failed, trying cache:', err.code || err.message);
        }

        // Try cache file
        try {
            await this.loadWeightsFromCache();
            this.mode = 'CACHE';
            return;
        } catch (err) {
            console.warn('[WeightManager] Cache load failed, using defaults:', err.code || err.message);
        }

        // Fallback to hardcoded defaults
        this.weights = { ...this.defaultWeights };
        this.mode = 'DEFAULTS';
        console.log('[WeightManager] Using hardcoded default weights');
    }

    async loadWeightsFromDB() {
        const res = await db.query('SELECT factor_name, weight_value FROM weights');
        const rows = res.rows;

        this.weights = {};
        if (rows.length === 0) {
            this.weights = { ...this.defaultWeights };
            await this.saveAllWeights();
        } else {
            rows.forEach(row => {
                this.weights[row.factor_name] = row.weight_value;
            });
        }
    }

    async loadWeightsFromCache() {
        const data = fs.readFileSync(this.cacheFile, 'utf8');
        const cached = JSON.parse(data);
        if (cached && typeof cached === 'object' && Object.keys(cached).length > 0) {
            this.weights = cached;
        } else {
            throw new Error('Cache empty or invalid');
        }
    }

    writeCache() {
        try {
            fs.writeFileSync(this.cacheFile, JSON.stringify(this.weights, null, 2));
        } catch (err) {
            console.error('[WeightManager] Failed to write cache:', err.message);
        }
    }

    async saveWeight(factor, value) {
        const sql = `
            INSERT INTO weights (factor_name, weight_value, updated_at)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            ON CONFLICT(factor_name)
            DO UPDATE SET weight_value=EXCLUDED.weight_value, updated_at=CURRENT_TIMESTAMP
        `;
        await db.query(sql, [factor, value]);
        this.weights[factor] = value;
        this.writeCache(); // update cache on every save
    }

    async saveAllWeights() {
        await Promise.all(
            Object.entries(this.weights).map(([factor, value]) => this.saveWeight(factor, value))
        );
    }

    async resetWeights() {
        console.log('[WeightManager] Resetting weights to defaults...');
        await db.query('DELETE FROM weights');
        await this.loadWeightsWithFallback();
        // Also reset velocity cache
        try {
            const fs = require('fs');
            const path = require('path');
            const velocityFile = path.join(process.cwd(), 'velocity_cache.json');
            if (fs.existsSync(velocityFile)) {
                fs.unlinkSync(velocityFile);
            }
        } catch (err) {
            console.warn('[WeightManager] Could not clear velocity cache:', err.message);
        }
        console.log('[WeightManager] Weights successfully reset.');
    }

    getWeight(factor) {
        // In MARKET_ONLY mode, internal weights are forced to 0
        if (this.mode === 'FALLBACK_MARKET_ONLY' && factor.includes('_internal')) {
            return 0;
        }
        return this.weights[factor] || 0;
    }

    setWeight(factor, value) {
        this.weights[factor] = value;
    }

    getAllWeights() {
        return { ...this.weights };
    }

    getMode() {
        return this.mode;
    }

    async setFallbackMode(mode) {
        if (mode === 'MARKET_ONLY') {
            this.mode = 'FALLBACK_MARKET_ONLY';
            console.log('[WeightManager] Switched to FALLBACK_MARKET_ONLY mode (internal weights disabled)');
        } else if (mode === 'RESTORE') {
            // Revert to the mode we were in before fallback (DB/CACHE/DEFAULTS)
            await this.loadWeightsWithFallback();
        } else {
            throw new Error(`Unknown fallback mode: ${mode}`);
        }
    }
}

module.exports = new WeightManager();
