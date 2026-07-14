const db = require('../src/config/database');

describe('Database Connection (PostgreSQL)', () => {
    // Note: pool is intentionally left open; Jest tears down the process.


    test('db.query executes a simple statement', async () => {
        const result = await db.query('SELECT 1 AS value');
        expect(result.rows[0].value).toBe(1);
    });

    test('db.query supports parameterized queries', async () => {
        const result = await db.query('SELECT $1::int AS value', [42]);
        expect(result.rows[0].value).toBe(42);
    });

    test('core tables exist after dbInit', async () => {
        const tables = await db.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name IN ('sessions_v2', 'weights', 'users', 'messages', 'reactions')
        `);
        const names = tables.rows.map(r => r.table_name);
        expect(names).toEqual(expect.arrayContaining(['weights', 'users']));
    });
});
