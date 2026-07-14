# UCL Discovery Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a standalone script to reverse-engineer the UCL simulation by collecting historical data, analyzing its statistical DNA, and optimizing the prediction engine's weights.

**Architecture:** A pipeline-based script that sequentially executes `Collection` $\rightarrow$ `Statistical Analysis` $\rightarrow$ `Optimization` $\rightarrow$ `Reporting`. It leverages existing `sportyClient`, `HeuristicEngine`, and `WeightManager` services.

**Tech Stack:** Node.js, Axios (via sportyClient), SQLite (via WeightManager/DbService).

---

### Task 1: Data Collection & Normalization

**Files:**
- Create: `src/scripts/discovery.js`

- [ ] **Step 1: Scaffold the script and implement `collectAllResults`**
Implement a function that calls `sportyClient.getResults` in a loop (adjusting `skip`) until no more data is returned.

```javascript
async function collectAllResults(leagueId) {
    let allResults = [];
    let skip = 0;
    const take = 100;
    while (true) {
        const data = await sportyClient.getResults(leagueId, skip, take);
        if (!data || data.length === 0) break;
        allResults.push(...data);
        skip += take;
    }
    return allResults;
}
```

- [ ] **Step 2: Implement `normalizeMatchData`**
Transform the raw API result into a standardized object containing the actual goals and the current ranking/form as proxies for the match state.

```javascript
function normalizeMatchData(rawMatch, rankingMap) {
    return {
        homeTeam: rawMatch.homeTeam.name,
        awayTeam: rawMatch.awayTeam.name,
        homeGoals: parseInt(rawMatch.homeGoals),
        awayGoals: parseInt(rawMatch.awayGoals),
        homeRank: rankingMap[rawMatch.homeTeam.name] || 10,
        awayRank: rankingMap[rawMatch.awayTeam.name] || 10,
        // Form is assumed to be average (0.5) for historical data as API only gives current
        homeForm: 0.5,
        awayForm: 0.5
    };
}
```

- [ ] **Step 3: Verify collection**
Run the script to ensure it successfully fetches and normalizes a batch of results.
Expected: Console log showing "Collected X matches".

---

### Task 2: Statistical DNA Analysis

**Files:**
- Modify: `src/scripts/discovery.js`

- [ ] **Step 1: Implement `analyzeUCLDNA`**
Create a function that computes global averages and frequencies from the normalized data.

```javascript
function analyzeUCLDNA(matches) {
    let totalHomeGoals = 0, totalAwayGoals = 0, homeWins = 0, draws = 0, awayWins = 0, btts = 0, over25 = 0;
    matches.forEach(m => {
        totalHomeGoals += m.homeGoals;
        totalAwayGoals += m.awayGoals;
        if (m.homeGoals > m.awayGoals) homeWins++;
        else if (m.homeGoals === m.awayGoals) draws++;
        else awayWins++;
        if (m.homeGoals >= 1 && m.awayGoals >= 1) btts++;
        if (m.homeGoals + m.awayGoals > 2.5) over25++;
    });
    return {
        avgHomeGoals: totalHomeGoals / matches.length,
        avgAwayGoals: totalAwayGoals / matches.length,
        homeWinRate: homeWins / matches.length,
        drawRate: draws / matches.length,
        awayWinRate: awayWins / matches.length,
        bttsRate: btts / matches.length,
        over25Rate: over25 / matches.length
    };
}
```

- [ ] **Step 2: Run analysis and verify**
Execute the analyzer on the collected set.
Expected: Console log showing calculated rates (e.g., "BTTS Rate: 0.62").

---

### Task 3: Brier Score Optimization (Grid Search)

**Files:**
- Modify: `src/scripts/discovery.js`

- [ ] **Step 1: Implement the Brier Score calculator**
Create a helper toP la Brier Score calculator
Create a helper to measure the error of a specific probability.

```javascript
function calculateBrier(prob, actual) {
    return Math.pow(prob - (actual ? 1 : 0), 2);
}
```

- [ ] **Step 2: Implement `optimizeWeights`**
Create the Grid Search loop. It must iterate through the parameter space and use `HeuristicEngine` to predict and evaluate.

```javascript
async function optimizeWeights(matches) {
    const baseRates = [0.8, 1.0, 1.2, 1.4, 1.6];
    const weightsRange = [0.1, 0.3, 0.5, 0.7, 0.9];
    let bestScore = Infinity;
    let bestParams = {};

    for (const br of baseRates) {
        for (const wr of weightsRange) {
            for (const wf of weightsRange) {
                for (const wb of weightsRange) {
                    // Simulate predictions with these params and calculate average Brier Score
                    // ... implementation using HeuristicEngine ...
                }
            }
        }
    }
    return bestParams;
}
```

- [ ] **Step 3: Implement Train/Validation Split**
Split the `matches` array (80/20) and ensure the `bestParams` from the train set are verified on the validation set.

- [ ] **Step 4: Verify optimization**
Run the optimizer.
Expected: Log showing "Best Brier Score found: 0.XXXX with params...".

---

### Task 4: Final Integration and Reporting

**Files:**
- Modify: `src/scripts/discovery.js`

- [ ] **Step 1: Create the `generateReport` function**
Format the findings from the analyzer and optimizer into a human-readable console output.

- [ ] **Step 2: Implement the main execution loop**
Connect all pieces: `load settings` $\rightarrow$ `collect` $\rightarrow$ `analyze` $\rightarrow$ `optimize` $\rightarrow$ `report`.

- [ ] **Step 3: Final Test Run**
Execute `node src/scripts/discovery.js`.
Expected: A complete report showing the UCL DNA and the recommended weights.
