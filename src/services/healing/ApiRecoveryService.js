const healthMonitor = require('./HealthMonitor');

class ApiRecoveryService {
    constructor() {
        this.userAgents = [
            'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
            'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
            'Mozilla/5.0 (Linux; Android 12; Samsung SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
            'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36'
        ];
        this.appVersions = ['27869', '27870', '27871', '27872'];
        this.currentIndex = 0;
    }

    getCurrentIdentity() {
        return {
            userAgent: this.userAgents[this.currentIndex],
            appVersion: this.appVersions[this.currentIndex]
        };
    }

    rotateIdentity() {
        this.currentIndex = (this.currentIndex + 1) % this.userAgents.length;
        console.log(`[ApiRecovery] Identity rotated. New index: ${this.currentIndex}`);
        return this.getCurrentIdentity();
    }

    async executeWithRetry(fn, maxRetries = 3) {
        let attempt = 0;
        while (attempt < maxRetries) {
            try {
                return await fn();
            } catch (err) {
                attempt++;
                healthMonitor.reportApiError();

                if (attempt >= maxRetries) throw err;

                // Check if it's a block error (403, 429) or a network timeout/unreachability
                const isBlock = err.response && (err.response.status === 403 || err.response.status === 429);
                const isNetworkError = !err.response && (err.code === 'ETIMEDOUT' || err.code === 'ENETUNREACH');

                if (isBlock || isNetworkError) {
                    console.log(`[ApiRecovery] Block or Network issue detected (${err.code || err.response?.status}). Rotating identity...`);
                    this.rotateIdentity();
                }

                const delay = Math.pow(2, attempt) * 1000;
                console.log(`[ApiRecovery] Attempt ${attempt} failed. Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
}

module.exports = new ApiRecoveryService();
