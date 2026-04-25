const weightManager = require('./WeightManager');
const intelligenceService = require('../intelligence/LeagueIntelligenceService');

class HeuristicEngine {
    constructor() {
        this.predictionCache = new Map();
        this.CACHE_TTL = 60000; // 1 minute
    }

    async predict(match) {
        const { homeTeam, awayTeam } = match;
        const homeName = homeTeam.name;
        const awayName = awayTeam.name;
        const matchKey = `${homeName}_vs_${awayName}`;

        // 0. CACHE CHECK
        const cached = this.predictionCache.get(matchKey);
        if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
            return cached.result;
        }

        // 1. PARALLEL DATA FETCHING
        // Fetch momentum and lambdas simultaneously to reduce await chain
        const [homeMomentum, awayMomentum, baseLambdas] = await Promise.all([
            intelligenceService.getMomentum(homeName),
            intelligenceService.getMomentum(awayName),
            this.calculateExpectedGoals(match)
        ]);

        let { home: homeLambda, away: awayLambda } = baseLambdas;

        // 2. MOMENTUM MODIFIER
        const homeMult = 1 + (homeMomentum.delta / 100);
        const awayMult = 1 + (awayMomentum.delta / 100);
        homeLambda *= homeMult;
        awayLambda *= awayMult;

        // 3. PROBABILITY GENERATION (Optimized Matrix)
        const matrix = this.generateProbabilityMatrix(homeLambda, awayLambda);
        let probs = this.deriveMarketProbabilities(matrix);

        // 4. MODIFIERS (Applied sequentially but with pre-fetched data)
        probs = this._applyDNAModifiers(homeName, awayName, probs);
        probs = this._applyKryptoniteModifiers(homeName, awayName, probs);
        probs = this._applyDrawCorrection(homeName, awayName, probs);

        // 5. FINAL DERIVATION
        const outcome = this._determineBestOutcome(probs.outcome);
        const btts = probs.btts['Yes'] > 0.5 ? 'Yes' : 'No';
        const ou = probs.ou['Over'] > 0.5 ? 'Over' : 'Under';

        const result = {
            outcome,
            outcomeConf: probs.outcome[outcome],
            btts,
            bttsConf: probs.btts[btts],
            ou,
            ouConf: probs.ou[ou],
            lambdas: { home: homeLambda, away: awayLambda },
            factors: probs.factors
        };

        // Store in cache
        this.predictionCache.set(matchKey, { result, timestamp: Date.now() });

        return result;
    }

    _applyDNAModifiers(homeName, awayName, probs) {
        const homeDNA = intelligenceService.getTeamDNA(homeName);
        const awayDNA = intelligenceService.getTeamDNA(awayName);
        const newProbs = JSON.parse(JSON.stringify(probs));

        if (!homeDNA || !awayDNA) return newProbs;

        // Synergy: High Offensive vs Leaky Defense -> Boost Over 2.5 and Home Win
        if (homeDNA.offensiveReliability === 'High Offensive' && awayDNA.defensiveReliability === 'Leaky Defense') {
            newProbs.ou.Over += 0.10;
            newProbs.ou.Under -= 0.10;
            newProbs.outcome['1'] += 0.05;
            newProbs.outcome['X'] -= 0.025;
            newProbs.outcome['2'] -= 0.025;
        }

        // Synergy: Iron Wall vs Low Offensive -> Boost Under 2.5 and Clean Sheet (Home Win/Draw)
        if (homeDNA.defensiveReliability === 'Iron Wall' && awayDNA.offensiveReliability === 'Low Offensive') {
            newProbs.ou.Under += 0.15;
            newProbs.ou.Over -= 0.15;
            newProbs.outcome['1'] += 0.05;
            newProbs.outcome['X'] += 0.05;
            newProbs.outcome['2'] -= 0.10;
        }

        // BTTS Adjustment: Both High Offensive -> Boost BTTS
        if (homeDNA.offensiveReliability === 'High Offensive' && awayDNA.offensiveReliability === 'High Offensive') {
            newProbs.btts['Yes'] += 0.10;
            newProbs.btts['No'] -= 0.10;
        }

        // Normalize probabilities to ensure they sum to 1
        this._normalize(newProbs.outcome);
        this._normalize(newProbs.btts);
        this._normalize(newProbs.ou);

        return newProbs;
    }

    _applyKryptoniteModifiers(homeName, awayName, probs) {
        const newProbs = JSON.parse(JSON.stringify(probs));

        // Check if Away is Kryptonite for Home
        const awayIsKryptonite = intelligenceService.isKryptonite(homeName, awayName);
        // Check if Home is Kryptonite for Away
        const homeIsKryptonite = intelligenceService.isKryptonite(awayName, homeName);

        if (awayIsKryptonite.isKryptonite) {
            const shift = 0.10 + (awayIsKryptonite.strength * 0.02);
            newProbs.outcome['2'] += shift;
            newProbs.outcome['1'] -= shift / 2;
            newProbs.outcome['X'] -= shift / 2;
        }

        if (homeIsKryptonite.isKryptonite) {
            const shift = 0.10 + (homeIsKryptonite.strength * 0.02);
            newProbs.outcome['1'] += shift;
            newProbs.outcome['2'] -= shift / 2;
            newProbs.outcome['X'] -= shift / 2;
        }

        this._normalize(newProbs.outcome);
        return newProbs;
    }

    _applyDrawCorrection(homeName, awayName, probs) {
        const newProbs = JSON.parse(JSON.stringify(probs));
        const homeDNA = intelligenceService.getTeamDNA(homeName);
        const awayDNA = intelligenceService.getTeamDNA(awayName);

        let drawBoost = 0;

        // 1. Iron Wall Synergy: Two defensive giants = High Draw Probability
        if (homeDNA?.defensiveReliability === 'Iron Wall' && awayDNA?.defensiveReliability === 'Iron Wall') {
            drawBoost += 0.20;
        }

        // 2. Low Offensive Synergy: Two struggling attacks = Low Score / Draw
        if (homeDNA?.offensiveReliability === 'Low Offensive' && awayDNA?.offensiveReliability === 'Low Offensive') {
            drawBoost += 0.15;
        }

        // 3. Equilibrium Detection: If 1 and 2 are very close, the match is a toss-up -> Draw likely
        const diff = Math.abs(newProbs.outcome['1'] - newProbs.outcome['2']);
        if (diff < 0.12) {
            drawBoost += 0.10;
        }

        if (drawBoost > 0) {
            newProbs.outcome['X'] += drawBoost;
            // Distribute the reduction proportionally to 1 and 2
            const reduction = drawBoost;
            const currentSum12 = newProbs.outcome['1'] + newProbs.outcome['2'];
            newProbs.outcome['1'] -= reduction * (newProbs.outcome['1'] / currentSum12);
            newProbs.outcome['2'] -= reduction * (newProbs.outcome['2'] / currentSum12);
        }

        // Global inflation for draws to better match historical 28% average
        const DRAW_INFLATION_FACTOR = weightManager.getWeight('draw_inflation');
        newProbs.outcome['X'] *= DRAW_INFLATION_FACTOR;

        this._normalize(newProbs.outcome);
        return newProbs;
    }

    _determineBestOutcome(outcomeProbs) {
        const sorted = Object.entries(outcomeProbs).sort((a, b) => b[1] - a[1]);
        const [best, secondBest] = sorted;

        // If 'X' is very close to the best, and the gap is small, prefer 'X'
        // This handles the "Equilibrium" case where Poisson might put '1' at 34% and 'X' at 33%
        if (best[0] !== 'X' && secondBest[0] === 'X') {
            if (best[1] - secondBest[1] < 0.07) {
                return 'X';
            }
        }

        return best[0];
    }

    _normalize(obj) {

        const sum = Object.values(obj).reduce((a, b) => a + b, 0);
        for (let key in obj) {
            obj[key] = obj[key] / sum;
        }
    }

    deriveMarketProbabilities(matrix) {
        let prob1 = 0, probX = 0, prob2 = 0;
        let probBTTS = 0;
        let probOver = 0;

        for (let i = 0; i <= 6; i++) {
            for (let j = 0; j <= 6; j++) {
                const p = matrix[i][j];
                if (i > j) prob1 += p;
                else if (i === j) probX += p;
                else prob2 += p;

                if (i >= 1 && j >= 1) probBTTS += p;
                if (i + j > 2.5) probOver += p;
            }
        }

        return {
            outcome: { '1': prob1, 'X': probX, '2': prob2 },
            btts: { 'Yes': probBTTS, 'No': 1 - probBTTS },
            ou: { 'Over': probOver, 'Under': 1 - probOver }
        };
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
        const baseRate = 0.8;

        const homeRankDiff = (awayTeam.ranking - homeTeam.ranking) / 20;
        const awayRankDiff = (homeTeam.ranking - awayTeam.ranking) / 20;

        const homeFormDiff = (homeTeam.form - awayTeam.form + 1) / 2;
        const awayFormDiff = (awayTeam.form - homeTeam.form + 1) / 2;

        const homeLambda = baseRate +
            (homeTeam.form * 0.7) +
            (weightManager.getWeight('outcome_ranking') * homeRankDiff) +
            (weightManager.getWeight('outcome_form') * homeFormDiff) +
            (weightManager.getWeight('outcome_bias') * 0.3);

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

        return matrix.map(row => row.map(val => val / totalSum));
    }

    _calculateFactors(match) {
        const { homeTeam, awayTeam, odds } = match;
        return {
            outcome_ranking: (awayTeam.ranking - homeTeam.ranking) / 20,
            outcome_form: (homeTeam.form - awayTeam.form + 1) / 2,
            outcome_odds: 1 / (odds.home || 2.0),
            btts_form: homeTeam.form * awayTeam.form * 2,
            ou_form: ((homeTeam.form + awayTeam.form) / 2) + (Math.abs(homeTeam.ranking - homeTeam.ranking) / 20 * 0.2)
        };
    }
}

module.exports = new HeuristicEngine();
