const db = require('../../config/database');
const bcrypt = require('bcryptjs');

class AdminAuthService {
    async authenticate(email, password) {
        const res = await db.query('SELECT * FROM admins WHERE email = $1', [email]);
        const admin = res.rows[0];

        if (admin && await bcrypt.compare(password, admin.password)) {
            return { id: admin.id, email: admin.email };
        }
        return null;
    }

    async createAdmin(email, password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const res = await db.query(
            'INSERT INTO admins (email, password) VALUES ($1, $2) RETURNING id',
            [email, hashedPassword]
        );
        return res.rows[0].id;
    }
}

module.exports = new AdminAuthService();
