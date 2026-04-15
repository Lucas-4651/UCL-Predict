# VFL Discovery Module Implementation Plan

> **Context**: This module is a standalone diagnostic and calibration tool designed to reverse-engineer the VFL simulation engine by analyzing historical data.

## Goal
Implement an independent script that collects all available historical match results, analyzes the statistical "DNA" of the VFL, and optimizes the prediction engine's weights to minimize the Brier Score.

## Architecture

### 1. Components
- **Discovery Orchestrator (`src/scripts/discovery.js`)**: The main entry point that coordinates the pipeline: `Collection` $\rightarrow$ `Analysis` $\rightarrow$ `Optimization` $\rightarrow$ `Reporting`.
- **DataCollector**: 
    - Fetches all results using `sportyClient.getResults`.
    - Normalizes raw API data into a internal match format.
    - Handles pagination and API rate limits.
- **StatisticalAnalyzer**: 
    - Calculates global mean goals per team.
    - Calculates win/draw/loss ratios.
    - Computes the actual frequency of BTTS and Over 2.5.
    - Generates a score distribution matrix.
- **WeightOptimizer**: 
    - Implements a Grid Search over `baseRate`, `outcome_ranking`, `outcome_form`, and `outcome_bias`.
    - Uses a Train/Validation split (80/20) to prevent overfitting.
    - Objective function: Minimize the average Brier Score across the dataset.

### 2. Data Flow
1. **API $\rightarrow$ Collector**: Loop through all results pages $\rightarrow$ Raw List.
2. **Collector $\rightarrow$ Analyzer**: Raw List $\rightarrow$ Statistical Summary.
3. **Collector $\rightarrow$ Optimizer**: Raw List + Current Rankings $\rightarrow$ Iterative simulation $\rightarrow$ Optimal Parameters.
4. **Optimizer $\rightarrow$ Console**: Optimal Parameters + Performance Metrics $\rightarrow$ Final Report.

### 3. Optimization Logic
- **Parameter Space**:
    - `baseRate`: [0.5, 2.0], step 0.05
    - `outcome_ranking`: [0.1, 1.0], step 0.1
    - `outcome_form`: [0.1, 1.0], step 0.1
    - `outcome_bias`: [0.0, 1.0], step 0.1
- **Execution**:
    - For each candidate combination $\rightarrow$ Run predictions on Train Set $\rightarrow$ Compute Brier Score.
    - Select best candidate $\rightarrow$ Verify on Validation Set.

## Success Criteria
- Successfully collect >100 matches (depending on API availability).
- Generate a report that reveals the actual VFL goal average.
- Provide a set of weights that significantly reduces the Brier Score compared to default weights.

## Constraints
- Must remain an independent script (no side effects on production DB during analysis).
- Must respect API timeout and rate limits.
