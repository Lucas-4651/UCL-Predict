const db = require('../config/database');

/**
 * ChatService handles all communication between the application and the messages table.
 */
class ChatService {
    /**
     * Retrieves the most recent non-deleted messages.
     * Pinned messages always come first.
     */
    async getRecentMessages(limit = 50) {
        const query = `
            SELECT m.*, u.username as user_name
            FROM messages m
            LEFT JOIN users u ON m.user_id = u.id
            WHERE m.is_deleted = false
            ORDER BY m.is_pinned DESC, m.created_at ASC
            LIMIT $1
        `;
        const result = await db.query(query, [limit]);
        return result.rows;
    }

    /**
     * Sends a new message.
     * @param {number|null} userId - The ID of the user sending the message (null for system/global admin broadcasts if not linked to a user).
     * @param {string} content - Message content.
     * @param {string} type - 'broadcast' or 'chat'.
     */
    async sendMessage(userId, content, type = 'chat') {
        const query = `
            INSERT INTO messages (user_id, content, type)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        const result = await db.query(query, [userId, content, type]);
        return result.rows[0];
    }

    /**
     * Moderates a message (pin or delete).
     * @param {number} messageId - ID of the message.
     * @param {Object} updates - Fields to update (is_pinned, is_deleted).
     */
    async moderateMessage(messageId, updates) {
        const fields = [];
        const values = [];
        let index = 1;

        for (const [key, value] of Object.entries(updates)) {
            fields.push(`${key} = $${index}`);
            values.push(value);
            index++;
        }

        if (fields.length === 0) return null;

        const query = `
            UPDATE messages
            SET ${fields.join(', ')}
            WHERE id = $${index}
            RETURNING *
        `;
        values.push(messageId);
        const result = await db.query(query, values);
        return result.rows[0];
    }
}

module.exports = new ChatService();
