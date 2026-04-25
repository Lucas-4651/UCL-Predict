const HeuristicEngine = require('./src/services/predictor/HeuristicEngine');
const matrix = HeuristicEngine.generateProbabilityMatrix(1.2, 0.8);
console.log('Matrix size:', matrix.length, 'x', matrix[0].length);
const sum = matrix.flat().reduce((a, b) => a + b, 0);
console.log('Sum:', sum);
if (matrix.length === 7 && matrix[0].length === 7 && Math.abs(sum - 1.0) < 0.0001) {
    console.log('SUCCESS');
} else {
    console.log('FAILURE');
    process.exit(1);
}
