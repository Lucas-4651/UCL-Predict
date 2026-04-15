const HeuristicEngine = require('./src/services/predictor/HeuristicEngine');
const prob = HeuristicEngine._calculatePoisson(1, 1.0);
console.log(`Poisson(1, 1.0) = ${prob}`);
if (Math.abs(prob - 0.367879) < 0.0001) {
    console.log('SUCCESS');
} else {
    console.log('FAILURE');
    process.exit(1);
}
