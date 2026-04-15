const db = require('./src/config/database');
db.get('PRAGMA journal_mode', (err, row) => {
    if (err) {
        console.error('DETAILED ERROR:', err);
        process.exit(1);
    }
    console.log('Journal Mode:', row.journal_mode);
    process.exit(0);
});
