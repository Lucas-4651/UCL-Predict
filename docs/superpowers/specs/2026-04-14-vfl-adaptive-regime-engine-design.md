# Design Spec: VFL Adaptive Regime Engine
Date: 2026-04-14
Status: Approved by User

## 1. Overview
The goal is to evolve the VFL prediction engine from a linear hybrid model to an adaptive system capable of detecting simulation "regimes" and adjusting its behavior accordingly. This addresses the specific nature of VFL where favorites usually win (~50%), draws are frequent (~30%), and surprises occur (~20%).

## 2. Architecture
The system implements a closed-loop feedback mechanism consisting of three main layers:

### 2.1. Detection Layer (`RegimeDetector`)
- **Responsibility**: Analyze recent outcomes to determine the current simulation state.
- **Logic**:
    - Monitor a sliding window of the last 20 matches.
    - Calculate the "Surprise Rate" (Outsiders winning).
    - **State Transition**:
        - `Stable` $\rightarrow$ `Chaotic` if Surprise Rate > 25%.
        - `Chaotic` $\rightarrow$ `Stable` if Surprise Rate < 15%.
        - **Hysteresis**: The gap between 15% and 25% prevents rapid oscillation.

### 2.2. Selection Layer (`ProfileSwitcher`)
- **Responsibility**: Manage and activate weight sets based on the detected regime.
- **Profiles**:
    - `Safe Profile`: Optimized for high-probability outcomes (favorites).
    - `Surprise Profile`: Higher sensitivity to form and ranking deltas to capture outliers.
- **Mechanism**: Dynamically swaps the weight set provided to the `HeuristicEngine`.

### 2.3. Execution Layer (`HeuristicEngine`)
- **Responsibility**: Calculate the prediction score using the active profile.
- **Input**: Match data + Active Weight Set.
- **Output**: Prediction (1, X, 2) and Confidence.

## 3. Auto-Learning & Correction (`AdaptiveLearningLoop`)
The learning process is now profile-aware and distribution-aware.

### 3.1. Profile-Specific Updates
- Only the weights of the **active profile** used for the prediction are updated.
- This prevents "pollution" of the `Safe` profile during chaotic periods.

### 3.2. Dynamic Draw Correction (The 30% Rule)
- **Goal**: Ensure the predicted draw rate converges to the observed VFL draw rate (~30%).
- **Mechanism**: 
    - Compare `Predicted Draw Rate` vs `Actual Draw Rate` over a window.
    - If `Actual > Predicted` $\rightarrow$ Narrow the gap between `thresholdHigh` and `thresholdLow` to expand the 'X' zone.
    - If `Actual < Predicted` $\rightarrow$ Widen the gap.

## 4. Guardrails & Stability
- **Weight Bounding**: All weights are clamped between $[0.0, 1.0]$.
- **Confidence Weighting**: Learning adjustments are scaled by the prediction confidence to prevent over-correction from "lucky" guesses.
- **Fallback**: If a regime is undefined or a profile is corrupted, the system defaults to the `Safe` profile.

## 5. Validation Metrics
- **Global Accuracy**: Increase in overall win rate compared to the baseline linear engine.
- **Regime Accuracy**: Higher precision on outliers when in `Chaotic` mode.
- **Draw Convergence**: Reduction in the delta between predicted and actual draw percentages.
- **Switch Speed**: Ability to detect regime shifts within 5-10 matches.
