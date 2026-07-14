# UCL-Predict Autonomous Prediction Platform

Autonomous, self-learning, and self-healing SaaS platform for football predictions.

## 🚀 Quick Start

### Run Server
```bash
node index.js
```
Server runs on `http://localhost:3000`. Admin dashboard available at `/admin`.

### Run Tests
```bash
npm test
```

### Database
Uses PostgreSQL. Connection is managed via `src/config/database.js` using a connection string from environment variables.

## 🏗️ Architecture

### Hybrid Prediction Engine
The system uses a hybrid model to predict outcomes across three markets: **1X2**, **BTTS (Both Teams To Score)**, and **Over/Under 2.5 Goals**.

**Hybrid Formula:**
$$\text{Score} = (W_{\text{market}} \times \text{Prob}_{\text{market}}) + (W_{\text{internal}} \times \text{Prob}_{\text{internal}})$$

- $\text{Prob}_{\text{market}}$: Implied probability derived from real-time odds ($1/\text{Odds}$).
- $\text{Prob}_{\text{internal}}$: Heuristic score based on Team Ranking, Form, and Home Bias.
- $W$: Market-specific weights stored in the database and optimized over time.

### Key Components
- `src/api/sportyClient.js`: Handles API communication with Sporty Tech using browser spoofing.
- `src/services/predictor/HeuristicEngine.js`: Implements the hybrid logic and market-specific predictions.
- `src/services/predictor/WeightManager.js`: Manages market-aware weights in SQLite.
- `src/services/predictor/LearningLoop.js`: Adjusts weights based on the error between predictions and actual results.
- `src/services/healing/`: Self-healing layer for API recovery, memory management, and system health.

## 🛠️ Project Patterns & Guidelines

### Zero Mock Policy
Every value displayed in the UI must come from the real API or the Heuristic Engine. No hardcoded mock data is allowed in the production flow.

### Weight Optimization
Weights are updated dynamically by the `LearningLoop`.
- **Positive Error**: Under-predicted the outcome $\rightarrow$ increase weight.
- **Negative Error**: Over-predicted the outcome $\rightarrow$ decrease weight.

### Data Flow
`sportyClient` $\rightarrow$ `userRoutes` $\rightarrow$ `HeuristicEngine` $\rightarrow$ `index.ejs`

## ⚠️ Gotchas & Quirks
- **API Spoofing**: The API requires specific headers (`User-Agent`, `App-Version`, `Origin`) to avoid blocks.
- **Session Structure**: Ensure `req.session.user` includes both `id` and `username` to prevent fallback names (e.g., "Utilisateur") in the chat.
- **Weight Migration**: When changing the weight schema, the `weights` table may need to be cleared to apply new defaults.
