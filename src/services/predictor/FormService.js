const sportyClient = require('../../api/sportyClient');
const settings = require('../../config/settings');

class FormService {
    constructor() {
        this.rankingCache = null;
        this.lastFetch = 0;
        this.CACHE_TTL = 60000; // 1 minute pour refléter les changements fréquents
    }

    async getRanking() {
        const now = Date.now();
        if (this.rankingCache && (now - this.lastFetch < this.CACHE_TTL)) {
            return this.rankingCache;
        }

        try {
            const rankingData = await sportyClient.getRanking(settings.LEAGUE_ID);
            this.rankingCache = rankingData;
            this.lastFetch = now;
            return rankingData;
        } catch (err) {
            console.error('Error fetching ranking:', err);
            return this.rankingCache || null;
        }
    }

    async getTeamForm(teamName) {
        try {
            const rankingData = await this.getRanking();
            if (!rankingData || !Array.isArray(rankingData.teams)) return 0.5;


            const team = rankingData.teams.find(t => t.name === teamName);
            if (!team || !team.history || team.history.length === 0) return 0.5;

            let points = 0;
            team.history.forEach(result => {
                if (result === 'Won') points += 3;
                else if (result === 'Draw') points += 1;
            });

            // Normalize points (max 15 for 5 matches) to 0-1 range
            return points / 15;
        } catch (err) {
            console.error(`Error calculating form for ${teamName}:`, err);
            return 0.5;
        }
    }
}

module.exports = new FormService();
