const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'game_data.db');
const db = new sqlite3.Database(DB_PATH);

const storage = {
    init: () => {
        return new Promise((resolve, reject) => {
            // First, create the table
            db.run(`
                CREATE TABLE IF NOT EXISTS match_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    match_external_id TEXT UNIQUE,
                    season TEXT,
                    home_team TEXT,
                    away_team TEXT,
                    home_goals INTEGER,
                    away_goals INTEGER,
                    goals_json TEXT,
                    round INTEGER,
                    captured_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) reject(err);
                else {
                    // Then, ensure the 'season' column exists for old databases
                    db.run(`ALTER TABLE match_history ADD COLUMN season TEXT`, (errAlt) => {
                        // We ignore this error because it will fail if the column already exists
                        resolve();
                    });
                }
            });
        });
    },

    saveMatch: (matchData) => {
        return new Promise((resolve, reject) => {
            const { externalId, season, homeTeam, awayTeam, homeGoals, awayGoals, goals, round } = matchData;
            const sql = `
                INSERT OR IGNORE INTO match_history
                (match_external_id, season, home_team, away_team, home_goals, away_goals, goals_json, round)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            db.run(sql, [externalId, season, homeTeam, awayTeam, homeGoals, awayGoals, JSON.stringify(goals), round], function(err) {
                if (err) reject(err);
                else resolve(this.changes > 0 ? this.lastID : null);
            });
        });
    },

    getAllMatches: () => {
        return new Promise((resolve, reject) => {
            db.all(`SELECT * FROM match_history ORDER BY captured_at ASC`, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    getMatchCount: () => {
        return new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as count FROM match_history`, [], (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });
    },

    close: () => {
        return new Promise((resolve) => {
            db.close(() => resolve());
        });
    }
};

module.exports = storage;
