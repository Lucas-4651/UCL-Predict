const HeuristicEngine = require('./src/services/predictor/HeuristicEngine');
const intelligenceService = require('./src/services/intelligence/LeagueIntelligenceService');

async function analyzeDraws(matches) {
    console.log('================================================================================');
    console.log('DRAW-DETECTOR: Analyzing why matches are (or aren't) predicted as draws');
    console.log('================================================================================\n');

    for (const match of matches) {
        const result = await HeuristicEngine.predict(match);
        const { outcome, probabilities, lambdas } = result;
        const { outcome: outcomeProbs } = probabilities;

        console.log(`MATCH: ${match.homeTeam.name} vs ${match.awayTeam.name}`);
        console.log(`- Prediction: [${outcome}] (Confidence: ${(result.outcomeConf * 100).toFixed(2)}%)`);
        console.log(`- Base Lambdas: Home: ${lambdas.home.toFixed(2)} | Away: ${lambdas.away.toFixed(2)}`);
        console.log(`- Final Probabilities: 1: ${(outcomeProbs['1'] * 100).toFixed(2)}% | X: ${(outcomeProbs['X'] * 100).toFixed(2)}% | 2: ${(outcomeProbs['2'] * 100).toFixed(2)}%`);

        console.log(`- Draw Analysis:`);

        const homeDNA = intelligenceService.getTeamDNA(match.homeTeam.name);
        const awayDNA = intelligenceService.getTeamDNA(match.awayTeam.name);

        if (homeDNA?.defensiveReliability === 'Iron Wall' && awayDNA?.defensiveReliability === 'Iron Wall') {
            console.log(`  [DNA] Both teams are Iron Walls (+0.20)`);
        }
        if (homeDNA?.offensiveReliability === 'Low Offensive' && awayDNA?.offensiveReliability === 'Low Offensive') {
            console.log(`  [DNA] Both teams are Low Offensive (+0.15)`);
        }

        const diff = Math.abs(outcomeProbs['1'] - outcomeProbs['2']);
        if (diff < 0.12) {
            console.log(`  [Equilibrium] Match balanced (Diff: ${(diff * 100).toFixed(2)}% < 12%) -> Boost +0.10`);
        }

        console.log(`  [Global] Inflation x1.2 multiplier applied to X`);

        if (outcome === 'X') {
            const sorted = Object.entries(outcomeProbs).sort((a, b) => b[1] - a[1]);
            const best = sorted[0];
            if (best[0] === 'X') {
                console.log(`  VERDICT: Draw was the statistically dominant outcome.`);
            } else {
                console.log(`  VERDICT: Draw chosen via Equilibrium Window (Gap: ${((best[1] - outcomeProbs['X']) * 100).toFixed(2)}% < 7%)`);
            }
        } else {
            const sorted = Object.entries(outcomeProbs).sort((a, b) => b[1] - a[1]);
            const gapToX = sorted[0][1] - outcomeProbs['X'];
            console.log(`  VERDICT: Not a draw. Gap to X: ${(gapToX * 100).toFixed(2)}% (Too wide for 7% window)`);
        }

        console.log('--------------------------------------------------------------------------------\n');
    }
}

const testMatches = [
    {
        homeTeam: { name: 'Bruges', ranking: 15, form: 0.6 },
        awayTeam: { name: 'Graz', ranking: 16, form: 0.5 },
        odds: { home: 2.5, draw: 3.2, away: 2.8 }
    },
    {
        homeTeam: { name: 'Girona', ranking: 10, form: 0.5 },
        awayTeam: { name: 'Belgrade', ranking: 11, form: 0.5 },
        odds: { home: 2.4, draw: 3.1, away: 2.9 }
    },
    {
        homeTeam: { name: 'R. Madrid', ranking: 1, form: 0.9 },
        awayTeam: { name: 'Zagreb', ranking: 20, form: 0.4 },
        odds: { home: 1.2, draw: 5.5, away: 12.0 }
    },
    {
        homeTeam: { name: 'Lille', ranking: 12, form: 0.5 },
        awayTeam: { name: 'Bologna', ranking: 13, form: 0.5 },
        odds: { home: 2.3, draw: 3.0, away: 3.1 }
    },
    {
        homeTeam: { name: 'Atalanta', ranking: 5, form: 0.7 },
        awayTeam: { name: 'Barca', ranking: 4, form: 0.7 },
        odds: { home: 2.8, draw: 3.4, away: 2.5 }
    }
];

analyzeDraws(testMatches).catch(console.error);
