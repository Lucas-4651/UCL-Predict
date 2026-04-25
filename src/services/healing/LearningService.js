const intelligenceService = require('../intelligence/LeagueIntelligenceService');

class LearningService {
    /**
     * Processes a match result and triggers intelligence updates.
     * @param {Object} result - The match result data
     * @param {string} result.homeTeam - Name of home team
     * @param {string} result.awayTeam - Name of away team
     * @param {number} result.homeScore - Actual goals scored by home team
     * @param {number} result.awayScore - Actual goals scored by away team
     * @param {number} result.homeRank - Ranking of home team
     * @param {number} result.awayRank - Ranking of away team
     */
    async processMatchResult({ homeTeam, awayTeam, homeScore, awayScore, homeRank, awayRank }) {
        console.log(`[LearningService] Processing result: ${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}`);

        const winner = homeScore > awayScore ? homeTeam : (awayScore > homeScore ? awayTeam : null);
        const loser = homeScore > awayScore ? awayTeam : (awayScore > homeScore ? homeTeam : null);
        const winRank = winner ? (winner === homeTeam ? homeRank : awayRank) : null;
        const loseRank = loser ? (loser === homeTeam ? homeRank : awayRank) : null;

        let wasSurprise = false;

        if (winner && loser) {
            // A surprise is when a team ranked 10+ positions lower beats a higher ranked team
            if (winRank > loseRank + 10) {
                wasSurprise = true;
                console.log(`[LearningService] 🚨 Surprise detected! ${winner} (Rank ${winRank}) beat ${loser} (Rank ${loseRank})`);

                // Increment Kryptonite relation
                intelligenceService.incrementKryptonite(loser, winner);
            }

            // Update Momentum
            // Winner gets a boost, Loser gets a penalty
            this._updateMomentumForMatch(winner, loser);
        } else {
            console.log(`[LearningService] Match ended in a draw. Momentum remains stable.`);
        }

        // Persist changes to JSON
        const success = await intelligenceService.save();
        if (success) {
            console.log(`[LearningService] Learning cycle complete. Intelligence state saved.`);
        } else {
            console.error(`[LearningService] Failed to save learned intelligence.`);
        }

        return {
            wasSurprise,
            winner,
            loser
        };
    }

    _updateMomentumForMatch(winner, loser) {
        // Basic momentum shift: Winner +2%, Loser -2%
        // In a real scenario, this could be scaled by the margin of victory
        intelligenceService.updateMomentum(winner, 2, 'Upgraded');
        intelligenceService.updateMomentum(loser, -2, 'Degraded');
    }
}

module.exports = new LearningService();
