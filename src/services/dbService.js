const db = require('../config/database');

class DbService {
    async getPrediction(matchId) {
        const res = await db.query('SELECT * FROM predictions WHERE match_id = $1 ORDER BY created_at DESC LIMIT 1', [matchId]);
        return res.rows[0];
    }

    async savePrediction(predictionData) {
        const {
            match_id, home_team, away_team, predicted_outcome,
            lambda_home, lambda_away, prob_matrix, predicted_probs, confidence
        } = predictionData;

        const sql = `
            INSERT INTO predictions (
                match_id, home_team, away_team, predicted_outcome,
                confidence, lambda_home, lambda_away, prob_matrix, predicted_probs
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id
        `;

        const res = await db.query(sql, [
            match_id, home_team, away_team, predicted_outcome,
            confidence, lambda_home, lambda_away,
            JSON.stringify(prob_matrix), JSON.stringify(predicted_probs)
        ]);
        return res.rows[0].id;
    }

    async updatePredictionResult(id, actualOutcome, actualHomeGoals, actualAwayGoals, isCorrect, brierScore) {
        const sql = `
            UPDATE predictions
            SET actual_outcome = $1, actual_home_goals = $2, actual_away_goals = $3, is_correct = $4, brier_score = $5
            WHERE id = $6
        `;
        const res = await db.query(sql, [actualOutcome, actualHomeGoals, actualAwayGoals, isCorrect, brierScore, id]);
        return res.rowCount;
    }

    async createUser(username, email, hashedPassword, role = 'user') {
        const sql = `INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id`;
        const res = await db.query(sql, [username, email, hashedPassword, role]);
        return res.rows[0].id;
    }

    async findUserByEmail(email) {
        const res = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        return res.rows[0];
    }

    async findUserById(userId) {
        const res = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
        return res.rows[0];
    }

    async getAllUsers() {
        const res = await db.query('SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC');
        return res.rows;
    }

    async getUserCount() {
        const res = await db.query('SELECT COUNT(*) as count FROM users');
        return parseInt(res.rows[0].count);
    }

    async deleteUser(userId) {
        const res = await db.query('DELETE FROM users WHERE id = $1', [userId]);
        return res.rowCount > 0;
    }

    async updateUserRole(userId, role) {
        const res = await db.query('UPDATE users SET role = $1 WHERE id = $2', [role, userId]);
        return res.rowCount > 0;
    }
}

module.exports = new DbService();
