const { EventEmitter } = require('events');

class RealtimeService {
    constructor() {
        this.bus = new EventEmitter();
        this.clients = new Set();
        this.presence = new Map(); // clientId -> { userId, username }
        this.heartbeat = setInterval(() => this.broadcast({ type: 'ping' }), 25000);
        if (this.heartbeat.unref) this.heartbeat.unref();
    }

    addClient(res) {
        this.clients.add(res);
    }

    removeClient(res) {
        this.clients.delete(res);
    }

    broadcast(event) {
        const payload = `data: ${JSON.stringify(event)}\n\n`;
        for (const res of this.clients) {
            try {
                res.write(payload);
                if (typeof res.flush === 'function') res.flush();
            } catch (err) {
                this.clients.delete(res);
            }
        }
    }
}

module.exports = new RealtimeService();
