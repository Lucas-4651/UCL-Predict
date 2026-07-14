# UCL Hybrid Prediction System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the prediction engine to a hybrid model supporting 1X2, BTTS, and Over/Under 2.5 goals.

**Architecture:** Transition to a weighted hybrid score combining market implied probability ($1/\text{Odds}$) and internal heuristics (Ranking, Form, Home Bias). Weights are market-specific and optimized via the Learning Loop.

**Tech Stack:** Node.js, SQLite, EJS.

---

### Task 1: Market-Aware Weight Management

**Files:**
- Modify: `src/services/predictor/WeightManager.js`

- [ ] **Step 1: Update `init()` and `loadWeights()` to support market prefixes**
  Modify `loadWeights` to group weights by market (e.g., `outcome_`, `btts_`, `ou_`).
  ```javascript
  async loadWeights() {
      return new Promise((resolve, reject) => {
          db.all('SELECT factor_name, weight_value FROM weights', (err, rows) => {
              if (err) return reject(err);
              this.weights = {};
              if (rows.length === 0) {
                  this.weights = {
                      outcome_market: 0.5, outcome_internal: 0.5,
                      btts_market: 0.5, btts_internal: 0.5,
                      ou_market: 0.5, ou_internal: 0.5,
                      outcome_ranking: 0.4, outcome_form: 0.3, outcome_bias: 0.3,
                      btts_form: 0.6, btts_ranking: 0.4,
                      ou_form: 0.7, ou_volatility: 0.3
                  };
                  this.saveAllWeights();
              } else {
                  rows.forEach(row => { this.weights[row.factor_name] = row.weight_value; });
              }
              resolve();
          });
      });
  }
  ```

- [ ] **Step 2: Verify weight retrieval**
  Run a small script to ensure `getWeight('outcome_market')` returns the expected value.

- [ ] **Step 3: Commit**
  ```bash
  git add src/services/predictor/WeightManager.js
  git commit -m "feat: implement market-aware weight management"
  ```

### Task 2: Hybrid Heuristic Engine

**Files:**
- Modify: `src/services/predictor/HeuristicEngine.js`

- [ ] **Step 1: Implement `predictOutcome()` with Hybrid Logic**
  Implement the formula: $\text{Score} = (W_{\text{market}} \times \text{Prob}_{\text{market}}) + (W_{\text{internal}} \times \text{Prob}_{\text{internal}})$.
  Apply thresholds: Home > 0.45, Away < 0.35, else Draw.
  ```javascript
  async predictOutcome(match) {
      const probMarket = 1 / (match.odds.home || 2.0);
      const probInternal = this._calculateInternalOutcomeScore(match);
      const score = (weightManager.getWeight('outcome_market') * probMarket) + 
                    (weightManager.getWeight('outcome_internal') * probInternal);
      
      let outcome = 'X';
      if (score > 0.45) outcome = '1';
      else if (score < 0.35) outcome = '2';
      
      return { outcome, confidence: score };
  }
  ```

- [ ] **Step 2: Implement `predictBTTS()`**
  Heuristic based on combined form and attack/defense rankings.
  ```javascript
  async predictBTTS(match) {
      const probInternal = (match.homeTeam.form + match.awayTeam.form) / 2;
      const score = (weightManager.getWeight('btts_internal') * probInternal); 
      // market probability for BTTS can be added if odds are extracted
      return { outcome: score > 0.5 ? 'Yes' : 'No', confidence: score };
  }
  ```

- [ ] **Step 3: Implement `predictOverUnder()`**
  Heuristic based on combined form.
  ```javascript
  async predictOverUnder(match) {
      const probInternal = (match.homeTeam.form + match.awayTeam.form) / 2;
      const score = (weightManager.getWeight('ou_internal') * probInternal);
      return { outcome: score > 0.5 ? 'Over' : 'Under', confidence: score };
  }
  ```

- [ ] **Step 4: Update `predict()` to return all three markets**
  ```javascript
  async predict(match) {
      const outcome = await this.predictOutcome(match);
      const btts = await this.predictBTTS(match);
      const ou = await this.predictOverUnder(match);
      return { outcome: outcome.outcome, outcomeConf: outcome.confidence, btts: btts.outcome, bttsConf: btts.confidence, ou: ou.outcome, ouConf: ou.confidence };
  }
  ```

- [ ] **Step 5: Commit**
  ```bash
  git add src/services/predictor/HeuristicEngine.js
  git commit -m "feat: implement hybrid model and new prediction markets"
  ```

### Task 3: Multi-Market Learning Loop

**Files:**
- Modify: `src/services/predictor/LearningLoop.js`

- [ ] **Step 1: Expand `_calculateError` to support BTTS and OU**
  ```javascript
  _calculateError(predicted, actual, market = 'outcome') {
      if (market === 'outcome') {
          const map = { '1': 1, 'X': 0, '2': -1 };
          return (map[actual] || 0) - (map[predicted] || 0);
      }
      const map = { 'Yes': 1, 'No': 0, 'Over': 1, 'Under': 0 };
      return (map[actual] || 0) - (map[predicted] || 0);
  }
  ```

- [ ] **Step 2: Update `adjustWeights` to target specific market weights**
  Ensure the correct weights (e.g., `outcome_internal` vs `btts_internal`) are updated based on the market.

- [ ] **Step 3: Commit**
  ```bash
  git add src/services/predictor/LearningLoop.js
  git commit -m "feat: expand learning loop for multi-market support"
  ```

### Task 4: Odds Extraction & Route Integration

**Files:**
- Modify: `src/routes/userRoutes.js`

- [ ] **Step 1: Extract BTTS and Over/Under odds from `eventBetTypes`**
  Update the loop to find 'BTTS' and 'Over/Under 2.5' bet types.
  ```javascript
  let odds = { home: 2.0, draw: 3.0, away: 3.0, bttsYes: 2.0, ouOver: 2.0 };
  // ... find 'BTTS' and 'Over/Under 2.5' in match.eventBetTypes
  ```

- [ ] **Step 2: Pass expanded prediction object to the view**
  Ensure `predictions.push` contains the full hybrid result.

- [ ] **Step 3: Commit**
  ```bash
  git add src/routes/userRoutes.js
  git commit -m "feat: extract expanded odds and update route logic"
  ```

### Task 5: Rich Prediction UI

**Files:**
- Modify: `src/views/index.ejs`

- [ ] **Step 1: Implement Rich Prediction Cards**
  Replace simple outcome display with a grid showing:
  - 1X2 Prediction + Confidence
  - BTTS Prediction + Confidence
  - Over/Under 2.5 Prediction + Confidence
  - Market Odds (1, X, 2)
  ```html
  <div class="card">
      <h3><%= p.match %></h3>
      <div class="market">
          <strong>1X2:</strong> <%= p.outcome %> (<%= (p.outcomeConf * 100).toFixed(1) %>%)
      </div>
      <div class="market">
          <strong>BTTS:</strong> <%= p.btts %> (<%= (p.bttsConf * 100).toFixed(1) %>%)
      </div>
      <div class="market">
          <strong>O/U 2.5:</strong> <%= p.ou %> (<%= (p.ouConf * 100).toFixed(1) %>%)
      </div>
  </div>
  ```

- [ ] **Step 2: Update CSS for better layout**
  Add styles for `.market` and improve card aesthetics.

- [ ] **Step 3: Commit**
  ```bash
  git add src/views/index.ejs
  git commit -m "feat: implement rich prediction cards in UI"
  ```
