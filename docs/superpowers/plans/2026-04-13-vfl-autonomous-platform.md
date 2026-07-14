# UCL Autonomous Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a lightweight, self-learning, self-healing, and anti-drift UCL prediction SaaS.

**Architecture:** Hybrid architecture with a "Day 0" heuristic predictor, a background learning loop that adjusts weights in SQLite/Neon, a drift monitor for automatic recalibration, and a comprehensive self-healing layer for 24/7 resilience.

**Tech Stack:** Node.js, Express, EJS, SQLite (dev) / Neon (prod), Axios.

---

## 📂 File Structure

### Infrastructure & Config
- `src/config/database.js`: DB connection and WAL mode setup.
- `src/config/settings.js`: Constants (League ID, API URLs, Learning Rate).

### API Layer
- `src/api/sportyClient.js`: Sporty Tech API wrapper with client spoofing.

### Prediction Engine (The Brain)
- `src/services/predictor/HeuristicEngine.js`: Calculates predictions using weighted factors.
- `src/services/predictor/WeightManager.js`: Manages weight loading and updates in DB.
- `src/services/predictor/LearningLoop.js`: Analyzes results and adjusts weights.

### Anti-Drift System
- `src/services/drift/DriftMonitor.js`: Calculates rolling accuracy and entropy.
- `src/services/drift/RecalibrationEngine.js`: Handles the weight reset and fast-learning phase.

### Self-Healing Layer
- `src/services/healing/HealthMonitor.js`: State machine (HEALTHY, DEGRADED, etc.) and heartbeat.
- `src/services/healing/ApiRecovery.js`: Exponential backoff and cache fallback.
- `src/services/healing/DbRecovery.js`: Queue-based write retries.
- `src/services/healing/MemoryRecovery.js`: Cache purging and adaptive polling.

### SaaS & Frontend
- `src/services/auth/AuthService.js`: JWT-based authentication.
- `src/routes/userRoutes.js`: Routes for the public dashboard.
- `src/routes/adminRoutes.js`: Routes for the admin dashboard.
- `src/views/index.ejs`: Public prediction view.
- `src/views/admin.ejs`: Observability dashboard.

### Background Jobs
- `src/jobs/learningJob.js`: Periodically triggers the LearningLoop.
- `src/jobs/healthJob.js`: Periodically triggers HealthMonitor.

---

## 🛠️ Implementation Tasks

### Task 1: Project Foundation & Database
**Files:**
- Create: `package.json`
- Create: `src/config/database.js`
- Create: `src/config/settings.js`
- Test: `tests/db.test.js`

- [ ] **Step 1: Initialize project and install dependencies**
  Run: `npm init -y && npm install express ejs axios sqlite3 jsonwebtoken dotenv`
- [ ] **Step 2: Write DB connection test**
  ```javascript
  // tests/db.test.js
  const db = require('../src/config/database');
  test('DB connection and WAL mode', async () => {
      const res = await db.get('PRAGMA journal_mode');
      expect(res.journal_mode).toBe('wal');
  });
  ```
- [ ] **Step 3: Implement `src/config/database.js` with WAL mode**
  ```javascript
  const sqlite3 = require('sqlite3').verbose();
  const db = new sqlite3.Database('./ucl.db');
  db.run('PRAGMA journal_mode = WAL');
  module.exports = db;
  ```
- [ ] **Step 4: Implement `src/config/settings.js`**
- [ ] **Step 5: Run DB test and commit**

### Task 2: Sporty Tech API Client
**Files:**
- Create: `src/api/sportyClient.js`
- Test: `tests/api.test.js`

- [ ] **Step 1: Write failing test for `getMatches`**
  ```javascript
  const client = require('../src/api/sportyClient');
  test('getMatches returns valid rounds', async () => {
      const data = await client.getMatches(8056);
      expect(data).toHaveProperty('rounds');
  });
  ```
- [ ] **Step 2: Implement `src/api/sportyClient.js` with critical headers**
  Implement Axios instance with `User-Agent`, `App-Version`, `Origin`, `Referer`.
- [ ] **Step 3: Run test and verify API response**
- [ ] **Step 4: Commit**

### Task 3: Day 0 Heuristic Predictor
**Files:**
- Create: `src/services/predictor/WeightManager.js`
- Create: `src/services/predictor/HeuristicEngine.js`
- Test: `tests/predictor.test.js`

- [ ] **Step 1: Implement `WeightManager.js` to load/save weights from `weights` table**
- [ ] **Step 2: Write failing test for `predict()`**
  ```javascript
  const engine = require('../src/services/predictor/HeuristicEngine');
  test('predict returns outcome and confidence', async () => {
      const res = await engine.predict(mockMatch);
      expect(res).toMatchObject({ outcome: expect.any(String), confidence: expect.any(Number) });
  });
  ```
- [ ] **Step 3: Implement `HeuristicEngine.js` using weighted factors**
  Formula: $\text{Score} = \sum (\text{Factor} \times \text{Weight})$.
- [ ] **Step 4: Run test and verify consistency**
- [ ] **Step 5: Commit**

### Task 4: The Self-Learning Loop
**Files:**
- Create: `src/services/predictor/LearningLoop.js`
- Create: `src/jobs/learningJob.js`
- Test: `tests/learning.test.js`

- [ ] **Step 1: Write failing test for `adjustWeights`**
  Input: { predicted: '1', actual: 'X', factors: { ranking: 0.8, form: 0.2 } }
  Expected: Weights for 'ranking' should decrease.
- [ ] **Step 2: Implement `LearningLoop.js` weight adjustment logic**
  Formula: $W_{\text{new}} = W_{\text{old}} + (\text{Error} \times \text{LearningRate})$.
- [ ] **Step 3: Implement `learningJob.js` to poll results and trigger learning**
- [ ] **Step 4: Run tests and verify weights update in DB**
- [ ] **Step 5: Commit**

### Task 5: Anti-Drift System
**Files:**
- Create: `src/services/drift/DriftMonitor.js`
- Create: `src/services/drift/RecalibrationEngine.js`
- Test: `tests/drift.test.js`

- [ ] **Step 1: Implement `DriftMonitor.js` rolling accuracy calculation**
- [ ] **Step 2: Implement `RecalibrationEngine.js` (Reset bias, Fast-Learning mode)**
- [ ] **Step 3: Write test to trigger recalibration when accuracy < threshold**
- [ ] **Step 4: Run test and verify weights are reset/adjusted**
- [ ] **Step 5: Commit**

### Task 6: Self-Healing Layer
**Files:**
- Create: `src/services/healing/HealthMonitor.js`
- Create: `src/services/healing/ApiRecovery.js`
- Create: `src/services/healing/DbRecovery.js`
- Create: `src/services/healing/MemoryRecovery.js`
- Test: `tests/healing.test.js`

- [ ] **Step 1: Implement `HealthMonitor.js` state machine (HEALTHY -> DEGRADED -> etc.)**
- [ ] **Step 2: Implement `ApiRecovery.js` (Exponential Backoff)**
- [ ] **Step 3: Implement `DbRecovery.js` (Write queue for SQLite locks)**
- [ ] **Step 4: Implement `MemoryRecovery.js` (Cache purging)**
- [ ] **Step 5: Run integration tests for recovery scenarios**
- [ ] **Step 6: Commit**

### Task 7: User SaaS Interface (EJS)
**Files:**
- Create: `src/services/auth/AuthService.js`
- Create: `src/routes/userRoutes.js`
- Create: `src/views/index.ejs`
- Test: `tests/ui.test.js`

- [ ] **Step 1: Implement `AuthService.js` (JWT login/register)**
- [ ] **Step 2: Implement `userRoutes.js` with "Refresh" endpoint**
- [ ] **Step 3: Create `index.ejs` dashboard with prediction cards**
- [ ] **Step 4: Run integration test (Refresh button -> Predictor -> UI)**
- [ ] **Step 5: Commit**

### Task 8: Admin Observability Dashboard
**Files:**
- Create: `src/routes/adminRoutes.js`
- Create: `src/views/admin.ejs`
- Test: `tests/admin.test.js`

- [ ] **Step 1: Implement `adminRoutes.js` to expose drift metrics and health state**
- [ ] **Step 2: Create `admin.ejs` with status indicators and RAM/DB monitors**
- [ ] **Step 3: Implement manual recalibration trigger**
- [ ] **Step 4: Run tests and verify admin access**
- [ ] **Step 5: Commit**
