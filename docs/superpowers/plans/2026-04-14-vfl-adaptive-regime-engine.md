# UCL Adaptive Regime Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a self-learning prediction engine that detects simulation regimes (Stable vs Chaotic) and adjusts its weight profiles and draw-rate thresholds automatically.

**Architecture:** 
- `RegimeDetector` analyzes recent outcomes to determine the state.
- `ProfileSwitcher` selects the corresponding weight set (`Safe` vs `Surprise`).
- `HeuristicEngine` uses the active profile for predictions.
- `AdaptiveLearningLoop` updates only the active profile and dynamically adjusts draw thresholds to match a 30% target.

**Tech Stack:** Node.js, SQLite, Jest.

---

## File Structure

### Modified Files
- `src/services/predictor/WeightManager.js`: Update to support `profile_id` in database queries and caching.
- `src/services/predictor/HeuristicEngine.js`: Update `predict` method to use weights from `ProfileSwitcher`.
- `src/services/predictor/LearningLoop.js`: Complete rewrite of `adjustWeights` to support profiles and draw-rate correction.

### New Files
- `src/services/predictor/RegimeDetector.js`: Logic for detecting Stable/Chaotic regimes.
- `src/services/predictor/ProfileSwitcher.js`: Logic for switching and loading profiles.
- `tests/services/predictor/RegimeDetector.test.js`: Unit tests for regime detection.
- `tests/services/predictor/AdaptiveLearning.test.js`: Unit tests for learning and draw correction.

---

## Implementation Tasks

### Task 1: Profile-Aware Weight Management

**Files:**
- Modify: `src/services/predictor/WeightManager.js`

- [ ] **Step 1: Update `init` to handle multiple profiles**
Modify the database initialization to ensure the `weights` table has a `profile_id` column. If not present, add it or recreate the table.
```javascript
// In WeightManager.js
async init() {
    await db.run('ALTER TABLE weights ADD COLUMN profile_id TEXT DEFAULT "safe"');
}
```

- [ ] **Step 2: Update `getWeight` to accept `profileId`**
Modify `getWeight(key, profileId = 'safe')` to filter by profile.
```javascript
getWeight(key, profileId = 'safe') {
    return this.weights[profileId]?.[key] || this.weights['safe'][key] || 0.5;
}
```

- [ ] **Step 3: Update `saveWeight` to support `profileId`**
```javascript
async saveWeight(key, value, profileId = 'safe') {
    await db.run('INSERT INTO weights (key, value, profile_id) VALUES (?, ?, ?) ON CONFLICT(key, profile_id) DO UPDATE SET value=excluded.value', [key, value, profileId]);
    await this.loadWeights();
}
```

- [ ] **Step 4: Update `loadWeights` to group by profile**
Change `this.weights` from a flat object to a nested object: `{ safe: { ... }, surprise: { ... } }`.
```javascript
async loadWeights() {
    const rows = await db.all('SELECT key, value, profile_id FROM weights');
    this.weights = {};
    rows.forEach(row => {
        if (!this.weights[row.profile_id]) this.weights[row.profile_id] = {};
        this.weights[row.profile_id][row.key] = row.value;
    });
}
```

- [ ] **Step 5: Commit**
```bash
git add src/services/predictor/WeightManager.js
git commit -m "refactor: support multiple weight profiles in WeightManager"
```

### Task 2: Regime Detection Logic

**Files:**
- Create: `src/services/predictor/RegimeDetector.js`
- Create: `tests/services/predictor/RegimeDetector.test.js`

- [ ] **Step 1: Implement `RegimeDetector` class**
```javascript
class RegimeDetector {
    async getRegime() {
        const recentMatches = await db.all('SELECT actualOutcome, predictedOutcome FROM match_history ORDER BY date DESC LIMIT 20');
        const surprises = recentMatches.filter(m => m.actualOutcome === 'surprise').length; // Simplified surprise logic
        const surpriseRate = surprises / recentMatches.length;

        if (surpriseRate > 0.25) return 'CHAOTIC';
        if (surpriseRate < 0.15) return 'STABLE';
        return this.currentRegime || 'STABLE';
    }
}
module.exports = new RegimeDetector();
```

- [ ] **Step 2: Write failing test for `RegimeDetector`**
```javascript
test('should switch to CHAOTIC when surprise rate > 25%', async () => {
    // Mock DB with 6/20 surprises
    expect(await RegimeDetector.getRegime()).toBe('CHAOTIC');
});
```

- [ ] **Step 3: Run test to verify it fails**
Run: `npm test tests/services/predictor/RegimeDetector.test.js`

- [ ] **Step 4: Fix implementation and verify pass**
Run: `npm test tests/services/predictor/RegimeDetector.test.js`

- [ ] **Step 5: Commit**
```bash
git add src/services/predictor/RegimeDetector.js tests/services/predictor/RegimeDetector.test.js
git commit -m "feat: implement regime detection logic"
```

### Task 3: Profile Switching Mechanism

**Files:**
- Create: `src/services/predictor/ProfileSwitcher.js`

- [ ] **Step 1: Implement `ProfileSwitcher`**
```javascript
const RegimeDetector = require('./RegimeDetector');
const weightManager = require('./WeightManager');

class ProfileSwitcher {
    async getActiveProfile() {
        const regime = await RegimeDetector.getRegime();
        return regime === 'CHAOTIC' ? 'surprise' : 'safe';
    }
}
module.exports = new ProfileSwitcher();
```

- [ ] **Step 2: Commit**
```bash
git add src/services/predictor/ProfileSwitcher.js
git commit -m "feat: implement profile switching mechanism"
```

### Task 4: Heuristic Engine Integration

**Files:**
- Modify: `src/services/predictor/HeuristicEngine.js`

- [ ] **Step 1: Inject `ProfileSwitcher` into `predict`**
```javascript
const ProfileSwitcher = require('./ProfileSwitcher');

async predict(match) {
    const profileId = await ProfileSwitcher.getActiveProfile();
    const outcome = await this.predictOutcome(match, profileId);
    // ... update other predict methods to accept profileId
}
```

- [ ] **Step 2: Pass `profileId` to internal calculation methods**
Update `predictOutcome`, `predictBTTS`, `predictOverUnder` to use `weightManager.getWeight(key, profileId)`.

- [ ] **Step 3: Commit**
```bash
git add src/services/predictor/HeuristicEngine.js
git commit -m "feat: integrate ProfileSwitcher into HeuristicEngine"
```

### Task 5: Adaptive Learning Loop (Profile-Aware)

**Files:**
- Modify: `src/services/predictor/LearningLoop.js`

- [ ] **Step 1: Update `adjustWeights` to handle `profileId`**
```javascript
async adjustWeights(prediction, actualOutcome, factors, market = 'outcome', profileId = 'safe', score = null) {
    // ... calculate error
    for (const [factor, value] of Object.entries(factors)) {
        const currentWeight = weightManager.getWeight(factor, profileId);
        // ... calculation
        await weightManager.saveWeight(factor, newWeight, profileId);
    }
}
```

- [ ] **Step 2: Commit**
```bash
git add src/services/predictor/LearningLoop.js
git commit -m "feat: implement profile-aware weight updates"
```

### Task 6: Dynamic Draw Correction

**Files:**
- Modify: `src/services/predictor/LearningLoop.js`

- [ ] **Step 1: Implement `adjustDrawThresholds` method**
```javascript
async adjustDrawThresholds() {
    const history = await db.all('SELECT actualOutcome, predictedOutcome FROM match_history ORDER BY date DESC LIMIT 50');
    const actualDraws = history.filter(m => m.actualOutcome === 'X').length / history.length;
    const predictedDraws = history.filter(m => m.predictedOutcome === 'X').length / history.length;
    
    const error = actualDraws - predictedDraws;
    const correction = error * 0.05; // Small step
    
    const currentHigh = weightManager.getWeight('outcome_threshold_high', 'safe');
    const currentLow = weightManager.getWeight('outcome_threshold_low', 'safe');
    
    await weightManager.saveWeight('outcome_threshold_high', currentHigh - correction, 'safe');
    await weightManager.saveWeight('outcome_threshold_low', currentLow - correction, 'safe');
}
```

- [ ] **Step 2: Integrate `adjustDrawThresholds` into the learning loop**
Call this method at the end of `adjustWeights`.

- [ ] **Step 3: Commit**
```bash
git add src/services/predictor/LearningLoop.js
git commit -m "feat: implement dynamic draw-rate correction"
```

### Task 7: Full Integration Test

**Files:**
- Create: `tests/services/predictor/AdaptiveLearning.test.js`

- [ ] **Step 1: Write a scenario test**
Simulate a series of matches: Stable $\rightarrow$ Chaotic $\rightarrow$ Stable. Verify that the active profile switches and that weights for both profiles are updated independently.

- [ ] **Step 2: Run and verify**
Run: `npm test tests/services/predictor/AdaptiveLearning.test.js`

- [ ] **Step 3: Commit**
```bash
git add tests/services/predictor/AdaptiveLearning.test.js
git commit -m "test: add full integration test for adaptive engine"
```
