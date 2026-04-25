const fs = require('fs');
const path = require('path');

class LeagueIntelligenceService {
    constructor() {
        this.data = null;
        this.teams = {};
        this.kryptoniteMap = new Map();
        this.momentumMap = new Map();
        this.isInitialized = false;
    }

    async init() {
        try {
            const filePath = path.join(__dirname, '../../../game_behavior_analysis.json');
            if (!fs.existsSync(filePath)) {
                console.error('[LeagueIntelligenceService] Analysis file not found. Intelligence will be disabled.');
                return;
            }

            const rawData = fs.readFileSync(filePath, 'utf8');
            this.data = JSON.parse(rawData);

            // Optimize data for fast lookup
            this._processIntelligence();

            this.isInitialized = true;
            console.log('✅ League Intelligence Service initialized successfully');
        } catch (err) {
            console.error('[LeagueIntelligenceService] Initialization failed:', err);
        }
    }

    async save() {
        try {
            const filePath = path.join(__dirname, '../../../game_behavior_analysis.json');
            // Sync the memory maps back to the main data object before saving
            this._syncMemoryToData();
            fs.writeFileSync(filePath, JSON.stringify(this.data, null, 2));
            return true;
        } catch (err) {
            console.error('[LeagueIntelligenceService] Save failed:', err);
            return false;
        }
    }

    updateMomentum(teamName, delta, type) {
        this.momentumMap.set(teamName, { delta, type });
        console.log(`[LeagueIntelligenceService] Momentum updated for ${teamName}: ${type} (${delta}%)`);
    }

    incrementKryptonite(loser, winner) {
        const key = `${loser}->${winner}`;
        const current = this.kryptoniteMap.get(key) || 0;
        this.kryptoniteMap.set(key, current + 1);
        console.log(`[LeagueIntelligenceService] Kryptonite strength increased for ${winner} vs ${loser}: ${current + 1}`);
    }

    _syncMemoryToData() {
        // Update Kryptonite from map to data.kryptonite
        if (!this.data.kryptonite) this.data.kryptonite = {};

        this.kryptoniteMap.forEach((count, key) => {
            this.data.kryptonite[key] = count;
        });

        // Update Momentum from map to data.seasonTweaks
        if (this.data.seasonTweaks) {
            this.data.seasonTweaks = this.data.seasonTweaks.map(tweak => {
                const update = this.momentumMap.get(tweak.team);
                if (update) {
                    return { ...tweak, delta: update.delta, type: update.type };
                }
                return tweak;
            });
        }
    }

    _processIntelligence() {
        // 1. Map Teams and DNA
        this.teams = this.data.teams || {};

        // 2. Map Momentum (Season Tweaks)
        if (this.data.seasonTweaks) {
            this.data.seasonTweaks.forEach(tweak => {
                this.momentumMap.set(tweak.team, {
                    delta: parseFloat(tweak.delta),
                    type: tweak.type // 'Upgraded' or 'Degraded'
                });
            });
        }

        // 3. Map Kryptonite (From upset patterns/detailed breakdown)
        // We extract the kryptonite from the detailed surprise analysis
        if (this.data.surprises) {
            this.data.surprises.forEach(s => {
                // In a surprise, the winner is the 'kryptonite' for the loser
                const key = `${s.loser}->${s.winner}`;
                this.kryptoniteMap.set(key, (this.kryptoniteMap.get(key) || 0) + 1);
            });
        }
    }

    getTeamDNA(teamName) {
        return this.teams[teamName]?.dna || null;
    }

    getTeamProfile(teamName) {
        return this.teams[teamName]?.profile || null;
    }

    getMomentum(teamName) {
        return this.momentumMap.get(teamName) || { delta: 0, type: 'Stable' };
    }

    isKryptonite(loser, winner) {
        const key = `${loser}->${winner}`;
        const strength = this.kryptoniteMap.get(key) || 0;
        return {
            isKryptonite: strength >= 2, // Considered kryptonite if they beat them twice or more in upsets
            strength: strength
        };
    }

    getSeasonalContext() {
        return {
            trends: this.data.seasonalTrends || {},
            gaps: this.data.rankingGaps || {}
        };
    }

    getFullIntelligenceReport() {
        return {
            teams: this.teams,
            momentum: Array.from(this.momentumMap.entries()).map(([team, data]) => ({
                team,
                ...data
            })),
            kryptonite: Array.from(this.kryptoniteMap.entries()).map(([relation, strength]) => {
                const [loser, winner] = relation.split('->');
                return { loser, winner, strength };
            }),
            context: this.getSeasonalContext()
        };
    }
}

module.exports = new LeagueIntelligenceService();
