const db = require('../config/database');

class MatchHistoryService {
    async saveMatch(matchData) {
        const {
            externalId, homeTeam, awayTeam, homeGoals, awayGoals, goals, round
        } = matchData;

        const sql = `
            INSERT INTO match_history (
                match_external_id, home_team, away_team, home_goals, away_goals, goals_json, round
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (match_external_id) DO NOTHING
            RETURNING id
        `;

        const res = await db.query(sql, [
            externalId, homeTeam, awayTeam, homeGoals, awayGoals,
            JSON.stringify(goals), round
        ]);

        return res.rows[0] ? res.rows[0].id : null;
    }

    async getAllMatches() {
        const sql = `SELECT * FROM match_history ORDER BY captured_at ASC`;
        const res = await db.query(sql);
        return res.rows;
    }

    async getMatchCount() {
        const sql = `SELECT COUNT(*) as count FROM match_history`;
        const res = await db.query(sql);
        return parseInt(res.rows[0].count);
    }

    async clearHistory() {
        await db.query('TRUNCATE TABLE match_history');
    }
}

module.exports = new MatchHistoryService();
