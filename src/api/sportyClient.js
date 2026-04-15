const axios = require('axios');
const settings = require('../config/settings');
const apiRecovery = require('../services/healing/ApiRecoveryService');

class SportyClient {
    constructor() {
        this.client = axios.create({
            baseURL: settings.API_BASE_URL,
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Origin': 'https://bet261.mg',
                'Referer': 'https://bet261.mg/'
            },
            timeout: 10000
        });

        // Interceptor to inject dynamic identity
        this.client.interceptors.request.use(config => {
            const { userAgent, appVersion } = apiRecovery.getCurrentIdentity();
            config.headers['User-Agent'] = userAgent;
            config.headers['App-Version'] = appVersion;
            return config;
        });
    }

    async getMatches(leagueId) {
        return apiRecovery.executeWithRetry(async () => {
            const { data } = await this.client.get(`/${leagueId}/matches`);
            return data;
        });
    }

    async getResults(leagueId, skip = 0, take = 10) {
        return apiRecovery.executeWithRetry(async () => {
            const { data } = await this.client.get(`/${leagueId}/results`, {
                params: { skip, take }
            });
            return data;
        });
    }

    async getRanking(leagueId) {
        return apiRecovery.executeWithRetry(async () => {
            const { data } = await this.client.get(`/${leagueId}/ranking`);
            return data;
        });
    }
}

module.exports = new SportyClient();
