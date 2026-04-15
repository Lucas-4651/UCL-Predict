# Design Spec: VFL Intelligence Engine (Probabilistic Model)
Date: 2026-04-14
Status: Approved
Sub-project: Intelligence

## 1. Goal
Increase prediction accuracy for VFL (Virtual Football League) simulated matches by moving from a linear weighted sum to a probabilistic Poisson model.

## 2. Core Concept
The system will stop predicting results directly. Instead, it will predict the "scoring intensity" ($\lambda$) for each team and use the Poisson distribution to derive all market probabilities.

## 3. Technical Architecture

### 3.1. Expected Goals ($\lambda$) Calculation
The `HeuristicEngine` will calculate $\lambda_{home}$ and $\lambda_{away}$ using the following formula:
$$\lambda = \text{Base\_Rate} + (W_{rank} \times \text{RankDiff}) + (W_{form} \times \text{FormDiff}) + (W_{bias} \times \text{Biais})$$
- **Base\_Rate**: Global average goals per match in VFL.
- **RankDiff/FormDiff**: Normalized differences between teams.
- **Biais**: Home/Away advantage constant.

### 3.2. Poisson Distribution Logic
For each team, the probability of scoring $x$ goals is:
$$P(x; \lambda) = \frac{e^{-\lambda} \lambda^x}{x!}$$
- **Constraint**: Max goals $x = 6$.
- **Matrix**: A 7x7 matrix of probabilities $P(x_{home}, x_{away})$ will be generated.
- **Normalization**: All probabilities in the matrix will be normalized to sum to 1.0.

### 3.3. Market Derivation
- **1X2**: $\sum P(x_{home} > x_{away})$ for '1', $\sum P(x_{home} = x_{away})$ for 'X', etc.
- **BTTS**: $\sum P(x_{home} \ge 1 \text{ and } x_{away} \ge 1)$.
- **Over/Under 2.5**: $\sum P(x_{home} + x_{away} > 2.5)$.

## 4. Learning Loop & Optimization

### 4.1. Brier Score Integration
The `LearningLoop` will use the Brier Score to evaluate accuracy:
$$\text{Brier Score} = (P(\text{actual}) - 1)^2$$
Lower scores indicate better calibration.

### 4.2. Weight Adjustment
- Weights influencing $\lambda$ will be adjusted based on the difference between predicted $\lambda$ and actual goals scored.
- **Learning Rate**: Implementation of a dynamic decay factor to stabilize weights over time.

## 5. Data Collection & Observability

### 5.1. Enhanced Predictions Schema
The `predictions` table will be updated to store:
- `lambda_home` (REAL)
- `lambda_away` (REAL)
- `prob_matrix` (TEXT/JSON)
- `brier_score` (REAL)
- `predicted_probs` (TEXT/JSON: probabilities for 1, X, 2, BTTS, OU)

### 5.2. Feedback Loop
1. **Prediction** $\rightarrow$ Store $\lambda$ and Matrix in DB.
2. **Match End** $\rightarrow$ Update `actual_outcome` and calculate Brier Score.
3. **Optimization** $\rightarrow$ Update weights in `WeightManager`.

## 6. Success Criteria
- Reduction in average Brier Score over 100 matches.
- Elimination of "Saturation" effect for high ranking deltas.
- Improved consistency between the three markets (1X2, BTTS, OU).
