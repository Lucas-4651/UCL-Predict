const weightManager = require('./WeightManager');

class HeuristicEngine {
    async predict(match) {
        // Ensure weights are loaded
        const weightManager = require('./WeightManager');
        if (!weightManager.initialized) {
            await weightManager.init();
        }

        const lambdas = this.calculateExpectedGoals(match);
        const matrix = this.generateProbabilityMatrix(lambdas.home, lambdas.away);
        const probs = this.deriveMarketProbabilities(matrix);

        // Determine best outcomes
        const outcome = Object.entries(probs.outcome).sort((a, b) => b[1] - a[1])[0][0];
        const btts = probs.btts['Yes'] > 0.5 ? 'Yes' : 'No';
        const ou = probs.ou['Over'] > 0.5 ? 'Over' : 'Under';

        return {
            outcome: outcome,
            outcomeConf: Math.max(...Object.values(probs.outcome)),
            btts: btts,
            bttsConf: Math.max(probs.btts['Yes'], probs.btts['No']),
            ou: ou,
            ouConf: Math.max(probs.ou['Over'], probs.ou['Under']),
            probabilities: probs,
            lambdas: lambdas,
            matrix: matrix,
            factors: this._calculateFactors(match)
        };
    }

    deriveMarketProbabilities(matrix) {
        let prob1 = 0, probX = 0, prob2 = 0;
        let probBTTS = 0;
        let probOver = 0;

        for (let i = 0; i <= 6; i++) {
            for (let j = 0; j <= 6; j++) {
                const p = matrix[i][j];
                // Outcome
                if (i > j) prob1 += p;
                else if (i === j) probX += p;
                else prob2 += p;

                // BTTS
                if (i >= 1 && j >= 1) probBTTS += p;

                // Over 2.5
                if (i + j > 2.5) probOver += p;
            }
        }

        return {
            outcome: { '1': prob1, 'X': probX, '2': prob2 },
            btts: { 'Yes': probBTTS, 'No': 1 - probBTTS },
            ou: { 'Over': probOver, 'Under': 1 - probOver }
        };
    }

    async predictOutcome(match) {
        throw new Error('Deprecated: Use predict() which now handles all markets probabilistically');
    }

    async predictBTTS(match) {
        throw new Error('Deprecated: Use predict() which now handles all markets probabilistically');
    }

    async predictOverUnder(match) {
        throw new Error('Deprecated: Use predict() which now handles all markets probabilistically');
    }

    _calculateInternalOutcomeScore(match) {
        const { homeTeam, awayTeam } = match;

        const rankingDelta = (awayTeam.ranking - homeTeam.ranking) / 20;
        const recentForm = homeTeam.form - awayTeam.form;
        const homeBias = 1.0;

        const internalScore = (weightManager.getWeight('outcome_ranking') * rankingDelta) +
                              (weightManager.getWeight('outcome_form') * ((recentForm + 1) / 2)) +
                              (weightManager.getWeight('outcome_bias') * homeBias);

        return Math.min(Math.max(internalScore, 0), 1);
    }

    _calculateInternalBTTSScore(match) {
        const { homeTeam, awayTeam } = match;
        // Product of forms ensures both must be capable of scoring
        return Math.min(Math.max(homeTeam.form * awayTeam.form * 2, 0), 1);
    }

    _calculateInternalOUScore(match) {
        const { homeTeam, awayTeam } = match;
        const combinedForm = (homeTeam.form + awayTeam.form) / 2;
        const rankingDelta = Math.abs(homeTeam.ranking - awayTeam.ranking) / 20;
        // Higher ranking delta often leads to more goals (dominance)
        return Math.min(Math.max(combinedForm + (rankingDelta * 0.2), 0), 1);
    }

    _calculatePoisson(x, lambda) {
        if (lambda === 0) return x === 0 ? 1 : 0;
        return (Math.exp(-lambda) * Math.pow(lambda, x)) / this._factorial(x);
    }

    _factorial(n) {
        if (n === 0 || n === 1) return 1;
        let res = 1;
        for (let i = 2; i <= n; i++) res *= i;
        return res;
    }

    calculateExpectedGoals(match) {
        const { homeTeam, awayTeam } = match;
        const weightManager = require('./WeightManager');

        const baseRate = 0.8; // Baseline goals per team

        const homeRankDiff = (awayTeam.ranking - homeTeam.ranking) / 20;
        const awayRankDiff = (homeTeam.ranking - awayTeam.ranking) / 20;

        const homeFormDiff = (homeTeam.form - awayTeam.form + 1) / 2;
        const awayFormDiff = (awayTeam.form - homeTeam.form + 1) / 2;

        // Home lambda: base + individual form + relative form + rank + bias
        const homeLambda = baseRate +
            (homeTeam.form * 0.7) +
            (weightManager.getWeight('outcome_ranking') * homeRankDiff) +
            (weightManager.getWeight('outcome_form') * homeFormDiff) +
            (weightManager.getWeight('outcome_bias') * 0.3);

        // Away lambda: base + individual form + relative form + rank
        const awayLambda = baseRate +
            (awayTeam.form * 0.7) +
            (weightManager.getWeight('outcome_ranking') * awayRankDiff) +
            (weightManager.getWeight('outcome_form') * awayFormDiff);

        return {
            home: Math.max(0.1, homeLambda),
            away: Math.max(0.1, awayLambda)
        };
    }

    generateProbabilityMatrix(lHome, lAway) {
        const matrix = [];
        let totalSum = 0;

        for (let i = 0; i <= 6; i++) {
            const row = [];
            for (let j = 0; j <= 6; j++) {
                const prob = this._calculatePoisson(i, lHome) * this._calculatePoisson(j, lAway);
                row.push(prob);
                totalSum += prob;
            }
            matrix.push(row);
        }

        // Normalize to ensure sum is 1.0 given the 6-goal limit
        return matrix.map(row => row.map(val => val / totalSum));
    }

    _calculateFactors(match) {
        const { homeTeam, awayTeam, odds } = match;
        return {
            outcome_ranking: (awayTeam.ranking - homeTeam.ranking) / 20,
            outcome_form: (homeTeam.form - awayTeam.form + 1) / 2,
            outcome_odds: 1 / (odds.home || 2.0),
            btts_form: homeTeam.form * awayTeam.form * 2,
            ou_form: ((homeTeam.form + awayTeam.form) / 2) + (Math.abs(homeTeam.ranking - awayTeam.ranking) / 20 * 0.2)
        };
    }
}

module.exports = new HeuristicEngine();
