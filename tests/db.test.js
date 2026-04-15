const db = require('../src/config/database');

test('DB connection and WAL mode', async () => {
    // Using a promise-based wrapper for sqlite3 since it uses callbacks
    const getJournalMode = () => {
        return new Promise((resolve, reject) => {
            db.get('PRAGMA journal_mode', (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    };

    const res = await getJournalMode();
    expect(res.journal_mode).toBe('wal');
});
