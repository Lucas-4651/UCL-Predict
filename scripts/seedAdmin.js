const AdminAuthService = require('./src/services/auth/AdminAuthService');
const db = require('./src/config/database');

async function seedAdmin() {
    try {
        const email = 'admin@vfl-predict.com';
        const password = 'admin_password_2026'; // In a real app, this would be in .env

        const res = await db.query('SELECT * FROM admins WHERE email = $1', [email]);
        if (res.rows.length > 0) {
            console.log('Admin already exists');
            return;
        }

        const id = await AdminAuthService.createAdmin(email, password);
        console.log(`Admin created successfully with ID: ${id}`);
        console.log(`Login with: ${email} / ${password}`);
    } catch (err) {
        console.error('Seeding failed:', err);
    } finally {
        await db.close();
    }
}

seedAdmin();
