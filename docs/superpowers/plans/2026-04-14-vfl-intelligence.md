# VFL Intelligence Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a probabilistic Poisson-based prediction engine with a Brier Score learning loop for VFL simulations.

**Architecture:** Expected Goals ($\lambda$) Calculation $\rightarrow$ Poisson Probability Matrix $\rightarrow$ Market Probabilities $\rightarrow$ Brier Score Optimization.

**Tech Stack:** Node.js, SQLite.

---

## File Mapping
- `src/config/dbInit.js`: Update `predictions` table schema.
- `src/services/predictor/HeuristicEngine.js`: Implement $\lambda$ logic, Poisson matrix, and market derivation.
- `src/services/predictor/LearningLoop.js`: Implement Brier Score and weight optimization.
- `tests/predictor.test.js`: (New) Unit tests for Poisson and $\lambda$ logic.
- `tests/learning.test.js`: (New) Unit tests for Brier Score and weight updates.

---

## Implementation Tasks

### Task 1: Database Schema Evolution
**Files:**
- Modify: `src/config/dbInit.js`

- [ ] **Step 1: Update predictions table schema**
Modify the `predictions` table creation script to include:
- `lambda_home` (REAL)
- `lambda_away` (REAL)
- `prob_matrix` (TEXT) - JSON string of the 7x7 matrix.
- `predicted_probs` (TEXT) - JSON string containing { '1': p1, 'X': pX, '2': p2, 'btts': pB, 'ou': pO }.
- `brier_score` (REAL)

- [ ] **Step 2: Reset database to apply changes**
Run: `rm vfl.db && node src/config/dbInit.js`
Expected: `vfl.db` recreated with new schema.

- [ ] **Step 3: Commit**
```bash
git add src/config/dbInit.js
git commit -m "feat(db): expand predictions table for probabilistic data"
```

### Task 2: Poisson Math Core
**Files:**
- Modify: `src/services/predictor/HeuristicEngine.js`
- Test: `tests/predictor.test.js`

- [ ] **Step 1: Write failing test for Poisson probability**
```javascript
// tests/predictor.test.js
const HeuristicEngine = require('../src/services/predictor/HeuristicEngine');
test('calculatePoissonProbability returns correct value', () => {
    // For lambda=1.0, P(1) should be e^-1 * 1^1 / 1! approx 0.3678
    const prob = HeuristicEngine._calculatePoisson(1, 1.0);
    expect(prob).toBeCloseTo(0.3678, 4);
});
```

- [ ] **Step 2: Run test and verify failure**
Run: `npm test tests/predictor.test.js`

- [ ] **Step 3: Implement `_calculatePoisson(x, lambda)`**
```javascript
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
```

- [ ] **Step 4: Run test to verify pass**

- [ ] **Step 5: Commit**
```bash
git add src/services/predictor/HeuristicEngine.js tests/predictor.test.js
git commit -m "feat(predictor): implement core Poisson probability function"
```

### Task 3: Lambda ($\lambda$) and Matrix Generation
**Files:**
- Modify: `src/services/predictor/HeuristicEngine.js`
- Test: `tests/predictor.test.js`

- [ ] **Step 1: Write failing test for Matrix generation**
```javascript
test('generateProbabilityMatrix returns 7x7 normalized matrix', () => {
    const matrix = HeuristicEngine.generateProbabilityMatrix(1.2, 0.8);
    expect(matrix.length).toBe(7);
    expect(matrix[0].length).toBe(7);
    const sum = matrix.flat().reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
});
```

- [ ] **Step 2: Implement `calculateExpectedGoals(match)` and `generateProbabilityMatrix(lHome, lAway)`**
1. Implement `calculateExpectedGoals`:
   - `lambdaHome = baseRate + (wRank * rankDiff) + ...`
2. Implement `generateProbabilityMatrix`:
   - Loop $i=0..6, j=0..6$.
   - `matrix[i][j] = _calculatePoisson(i, lHome) * _calculatePoisson(j, lAway)`.
   - Normalize matrix by dividing each cell by the sum of all cells.

- [ ] **Step 3: Run test and verify pass**

- [ ] **Step 4: Commit**
```bash
git add src/services/predictor/HeuristicEngine.js tests/predictor.test.js
git commit -m "feat(predictor): implement lambda calculation and Poisson matrix"
```

### Task 4: Market Derivation & Prediction Flow
**Files:**
- Modify: `src/services/predictor/HeuristicEngine.js`
- Test: `tests/predictor.test.js`

- [ ] **Step 1: Implement market derivation from matrix**
- `outcome`: Sum $i > j$ (1), $i = j$ (X), $i < j$ (2).
- `btts`: Sum $i \ge 1$ and $j \ge 1$.
- `ou`: Sum $i + j > 2.5$.

- [ ] **Step 2: Rewrite `predict(match)` to use the new flow**
- Calculate $\lambda_{home}, \lambda_{away}$.
- Generate matrix.
- Derive probabilities.
- Return object with probabilities and confidence.

- [ ] **Step 3: Write and run integration test for `predict()`**

- [ ] **Step 4: Commit**
```bash
git add src/services/predictor/HeuristicEngine.js tests/predictor.test.js
git commit -m "feat(predictor): derive market probabilities from Poisson matrix"
```

### Task 5: Detailed Logging Implementation
**Files:**
- Modify: `src/routes/userRoutes.js` (or where `predict` is called)
- Modify: `src/config/database.js`

- [ ] **Step 1: Implement `savePrediction` function in database service**
- Insert into `predictions` table: `lambda_home`, `lambda_away`, `prob_matrix` (JSON), `predicted_probs` (JSON).

- [ ] **Step 2: Integrate logging into the prediction flow**
- Call `savePrediction` immediately after `HeuristicEngine.predict()`.

- [ ] **Step 3: Commit**
```bash
git add src/config/database.js src/routes/userRoutes.js
git commit -m "feat(db): implement detailed logging of probabilistic predictions"
```

### Task 6: Brier Score & Learning Loop Update
**Files:**
- Modify: `src/services/predictor/LearningLoop.js`
- Test: `tests/learning.test.js`

- [ ] **Step 1: Write failing test for Brier Score**
```javascript
const LearningLoop = require('../src/services/predictor/LearningLoop');
test('calculateBrierScore returns correct value', () => {
    const score = LearningLoop.calculateBrierScore(0.7, 'correct'); // (1 - 0.7)^2 = 0.09
    expect(score).toBeCloseTo(0.09, 4);
});
```

- [ ] **Step 2: Implement `calculateBrierScore(prob, isCorrect)`**
- Return `Math.pow(isCorrect ? (1 - prob) : prob, 2)`.

- [ ] **Step 3: Update `adjustWeights` to use Brier Score and $\lambda$ error**
- Calculate error as `actualGoals - predictedLambda`.
- Adjust $\lambda$-related weights using this error $\times$ Brier Score.

- [ ] **Step 4: Run test and verify pass**

- [ ] **Step 5: Commit**
```bash
git add src/services/predictor/LearningLoop.js tests/learning.test.js
git commit -m "feat(learning): implement Brier Score based weight optimization"
```

### Task 7: Dynamic Learning Rate & Stabilization
**Files:**
- Modify: `src/services/predictor/LearningLoop.js`
- Modify: `src/config/settings.js`

- [ ] **Step 1: Implement learning rate decay**
- Update `LEARNING_RATE` using a formula: `initialLR * Math.pow(decayRate, matchesProcessed)`.

- [ ] **Step 2: Verify stability with a test script**
- Run a mock loop of 100 matches and verify that weight adjustments decrease over time.

- [ ] **Step 3: Commit**
```bash
git add src/services/predictor/LearningLoop.js src/config/settings.js
git commit -m "feat(learning): implement dynamic learning rate decay"
```

### Task 8: Final Validation & Cleanup
- [ ] **Step 1: Run all tests**
Run: `npm test`
- [ ] **Step 2: Verify DB records**
Run: `sqlite3 vfl.db "SELECT * FROM predictions LIMIT 1;"`
- [ ] **Step 3: Final Commit**
```bash
git commit -m "chore: finalize probabilistic engine implementation"
```
