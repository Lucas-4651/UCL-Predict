const db = require('../../config/database');

class WeightManager {
    constructor() {
        this.weights = {};
        this.initialized = false;
    }

    async init() {
        // Create table if not exists - mostly handled by dbInit.js but kept for robustness
        await db.query(`CREATE TABLE IF NOT EXISTS weights (
            factor_name TEXT PRIMARY KEY,
            weight_value DOUBLE PRECISION,
            last_updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )`);

        await this.loadWeights();
        this.initialized = true;
    }

    async loadWeights() {
        const res = await db.query('SELECT factor_name, weight_value FROM weights');
        const rows = res.rows;

        this.weights = {};
        if (rows.length === 0) {
            // Initial weights for Day 0 - Market Aware
            this.weights = {
                outcome_market: 0.5, outcome_internal: 0.5,
                btts_market: 0.5, btts_internal: 0.5,
                ou_market: 0.5, ou_internal: 0.5,
                outcome_ranking: 0.9, outcome_form: 0.7, outcome_bias: 0.3,
                outcome_threshold_high: 0.45, outcome_threshold_low: 0.35,
                btts_form: 0.6, btts_ranking: 0.4,
                ou_form: 0.7, ou_volatility: 0.3
            };
            await this.saveAllWeights();
        } else {
            rows.forEach(row => {
                this.weights[row.factor_name] = row.weight_value;
            });
        }
    }

    async saveWeight(factor, value) {
        const sql = `
            INSERT INTO weights (factor_name, weight_value, updated_at)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            ON CONFLICT(factor_name)
            DO UPDATE SET weight_value=EXCLUDED.weight_value, updated_at=EXCLUDED.updated_at
        `;
        await db.query(sql, [factor, value]);
        this.weights[factor] = value;
    }

    async saveAllWeights() {
        for (const [factor, value] of Object.entries(this.weights)) {
            await this.saveWeight(factor, value);
        }
    }

    async resetWeights() {
        console.log('[WeightManager] Resetting weights to defaults...');
        await db.query('DELETE FROM weights');
        await this.loadWeights();
        console.log('[WeightManager] Weights successfully reset.');
    }

    getWeight(factor) {
        return this.weights[factor] || 0;
    }

    setWeight(factor, value) {
        this.weights[factor] = value;
    }

    getAllWeights() {
        return { ...this.weights };
    }
}

module.exports = new WeightManager();
