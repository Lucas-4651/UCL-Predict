# UCL Hybrid Prediction System Design

**Date:** 2026-04-13
**Status:** Approved
**Topic:** Expansion of the prediction engine to include BTTS, Over/Under, and a Hybrid Model.

## 1. Goal
Transform the simple 1X2 predictor into a professional-grade hybrid prediction system that combines market implied probabilities with internal team heuristics, while expanding the prediction scope to include BTTS and Over/Under 2.5 goals.

## 2. Architecture

### 2.1 Hybrid Model Logic
The system will transition from a pure heuristic model to a hybrid model. For every market (1X2, BTTS, O/U), the prediction is calculated as:

$$\text{Score} = (W_{\text{market}} \times \text{Prob}_{\text{market}}) + (W_{\text{internal}} \times \text{Prob}_{\text{internal}})$$

- **$\text{Prob}_{\text{market}}$**: Calculated as $1 / \text{Odds}$.
- **$\text{Prob}_{\text{internal}}$**: Calculated by the `HeuristicEngine` using Ranking, Form, and Home Bias.
- **Weights ($W$)**: Stored in the database and adjusted by the `LearningLoop` based on real results.

### 2.2 New Prediction Markets

#### Market A: 1X2 (Outcome)
- **Internal Factors**: Ranking Delta, Team Form, Home Bias.
- **Thresholds**:
    - Home (1): Score $> 0.45$
    - Away (2): Score $< 0.35$
    - Draw (X): $0.35 \le \text{Score} \le 0.45$

#### Market B: BTTS (Both Teams To Score)
- **Internal Factors**: Average Form (Both teams), Attack/Defense Ranking.
- **Calculation**: Heuristic score based on the combined scoring probability of both teams.
- **Outcome**: 'Yes' if Score $> 0.5$, else 'No'.

#### Market C: Over/Under 2.5 Goals
- **Internal Factors**: Combined Form, League Volatility (based on result history).
- **Calculation**: Heuristic score based on predicted total goals.
- **Outcome**: 'Over' if Score $> 0.5$, else 'Under'.

## 3. Technical Implementation

### 3.1 Component Changes
- **`HeuristicEngine.js`**: 
    - Implement `predictOutcome()`, `predictBTTS()`, and `predictOverUnder()`.
    - Integration of $1/\text{Odds}$ as a primary factor.
- **`WeightManager.js`**: 
    - Expand `weights` table to support multiple markets (e.g., `outcome_market_prob`, `btts_market_prob`, `ou_market_prob`).
- **`LearningLoop.js`**: 
    - Expand error calculation to support BTTS and O/U.
    - Apply weight adjustments for all three markets.
- **`userRoutes.js`**: 
    - Update logic to extract `eventBetTypes` for BTTS and O/U odds.
    - Pass comprehensive data to the view.

### 3.2 UI Updates (`index.ejs`)
- Replace simple list with "Rich Prediction Cards".
- Display the 1X2 odds triplet.
- Display BTTS prediction and confidence.
- Display Over/Under 2.5 prediction and confidence.

## 4. Success Criteria
- **No more "All 2" predictions**: Predictions are distributed across 1, X, and 2 based on real data.
- **Accuracy Monitoring**: The `DriftMonitor` now tracks accuracy for all three markets.
- **Zero Mocks**: Every value displayed comes from the API or the Heuristic Engine.
