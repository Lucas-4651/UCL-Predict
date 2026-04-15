const db = require('../../config/database');

class DbRecoveryService {
    constructor() {
        this.writeQueue = [];
        this.processing = false;
    }

    async safeWrite(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.writeQueue.push({ sql, params, resolve, reject });
            this._processQueue();
        });
    }

    async _processQueue() {
        if (this.processing || this.writeQueue.length === 0) return;
        this.processing = true;

        while (this.writeQueue.length > 0) {
            const { sql, params, resolve, reject } = this.writeQueue.shift();
            try {
                await db.query(sql, params);
                resolve();
            } catch (err) {
                reject(err);
            }
        }
        this.processing = false;
    }
}

module.exports = new DbRecoveryService();
