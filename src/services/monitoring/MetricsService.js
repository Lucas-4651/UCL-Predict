const weightManager = require('../predictor/WeightManager');
const healthMonitor = require('../healing/HealthMonitor');
const driftDetector = require('../drift/DriftDetector');
const apiRecovery = require('../healing/ApiRecoveryService');
const learningLoop = require('../predictor/LearningLoop');

class MetricsService {
    constructor() {
        this.metrics = {
            // Counters
            http_requests_total: new Map(), // key: method_path_status
            predictions_total: 0,
            predictions_correct: 0,
            learning_updates_total: 0,
            weight_resets_total: 0,
            drift_detections_total: 0,
            recovery_actions_total: new Map(), // key: event_type
            api_failures_total: 0,
            db_failures_total: 0,
            
            // Gauges
            ram_usage_mb: 0,
            db_latency_ms: 0,
            weight_mode: 'unknown',
            health_state: 'unknown',
            drift_brier_score: 0,
            drift_hit_rate: 0,
            drift_calibration_error: 0,
            drift_detected: 0,
            circuit_breaker_state: 'CLOSED',
            
            // Histograms (simplified as arrays for quantiles)
            prediction_confidence: [],
            api_latency_ms: [],
            db_latency_samples: [],
        };
        
        this.maxHistogramSamples = 1000;
    }

    // HTTP request counter
    recordHttpRequest(method, path, statusCode) {
        const key = `${method} ${path} ${statusCode}`;
        const current = this.metrics.http_requests_total.get(key) || 0;
        this.metrics.http_requests_total.set(key, current + 1);
    }

    // Prediction metrics
    recordPrediction(correct = false) {
        this.metrics.predictions_total++;
        if (correct) this.metrics.predictions_correct++;
    }

    recordPredictionConfidence(confidence) {
        this.metrics.prediction_confidence.push(confidence);
        if (this.metrics.prediction_confidence.length > this.maxHistogramSamples) {
            this.metrics.prediction_confidence.shift();
        }
    }

    // Learning metrics
    recordLearningUpdate() {
        this.metrics.learning_updates_total++;
    }

    recordWeightReset() {
        this.metrics.weight_resets_total++;
    }

    // Drift metrics
    recordDriftDetection(metrics) {
        this.metrics.drift_detections_total++;
        this.metrics.drift_brier_score = metrics.brierScore || 0;
        this.metrics.drift_hit_rate = metrics.hitRate || 0;
        this.metrics.drift_calibration_error = metrics.calibrationError || 0;
        this.metrics.drift_detected = 1;
    }

    clearDriftDetected() {
        this.metrics.drift_detected = 0;
    }

    // Recovery metrics
    recordRecoveryAction(eventType) {
        const current = this.metrics.recovery_actions_total.get(eventType) || 0;
        this.metrics.recovery_actions_total.set(eventType, current + 1);
    }

    // API metrics
    recordApiFailure() {
        this.metrics.api_failures_total++;
    }

    recordApiLatency(latencyMs) {
        this.metrics.api_latency_ms.push(latencyMs);
        if (this.metrics.api_latency_ms.length > this.maxHistogramSamples) {
            this.metrics.api_latency_ms.shift();
        }
    }

    // DB metrics
    recordDbFailure() {
        this.metrics.db_failures_total++;
    }

    recordDbLatency(latencyMs) {
        this.metrics.db_latency_ms = latencyMs;
        this.metrics.db_latency_samples.push(latencyMs);
        if (this.metrics.db_latency_samples.length > this.maxHistogramSamples) {
            this.metrics.db_latency_samples.shift();
        }
    }

    // System metrics update (called periodically)
    updateSystemMetrics() {
        // RAM
        const ramUsage = process.memoryUsage().heapUsed / 1024 / 1024;
        this.metrics.ram_usage_mb = ramUsage;

        // Weight manager mode
        this.metrics.weight_mode = weightManager.getMode();

        // Health state
        this.metrics.health_state = healthMonitor.getState();

        // Circuit breaker
        const circuitState = apiRecovery.getCircuitState();
        this.metrics.circuit_breaker_state = circuitState.state;

        // Drift detector last check
        if (driftDetector.lastCheck) {
            // drift metrics are updated by recordDriftDetection
        }
    }

    // Helper to compute quantiles
    _quantile(arr, q) {
        if (!arr.length) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const idx = Math.min(Math.floor(q * sorted.length), sorted.length - 1);
        return sorted[idx];
    }

    // Generate Prometheus format output
    generatePrometheusOutput() {
        this.updateSystemMetrics();
        
        const lines = [];
        
        // Helper to sanitize metric names
        const sanitize = (str) => str.replace(/[^a-zA-Z0-9_]/g, '_');
        
        // HTTP requests
        lines.push('# HELP http_requests_total Total HTTP requests');
        lines.push('# TYPE http_requests_total counter');
        for (const [key, value] of this.metrics.http_requests_total) {
            const [method, path, status] = key.split(' ');
            lines.push(`http_requests_total{method="${method}",path="${sanitize(path)}",status="${status}"} ${value}`);
        }

        // Predictions
        lines.push('# HELP predictions_total Total predictions made');
        lines.push('# TYPE predictions_total counter');
        lines.push(`predictions_total ${this.metrics.predictions_total}`);
        
        lines.push('# HELP predictions_correct_total Total correct predictions');
        lines.push('# TYPE predictions_correct_total counter');
        lines.push(`predictions_correct_total ${this.metrics.predictions_correct}`);
        
        if (this.metrics.predictions_total > 0) {
            lines.push('# HELP prediction_accuracy Current prediction accuracy');
            lines.push('# TYPE prediction_accuracy gauge');
            lines.push(`prediction_accuracy ${this.metrics.predictions_correct / this.metrics.predictions_total}`);
        }

        lines.push('# HELP prediction_confidence Prediction confidence histogram');
        lines.push('# TYPE prediction_confidence summary');
        if (this.metrics.prediction_confidence.length > 0) {
            lines.push(`prediction_confidence_sum ${this.metrics.prediction_confidence.reduce((a, b) => a + b, 0)}`);
            lines.push(`prediction_confidence_count ${this.metrics.prediction_confidence.length}`);
            lines.push(`prediction_confidence{quantile="0.5"} ${this._quantile(this.metrics.prediction_confidence, 0.5)}`);
            lines.push(`prediction_confidence{quantile="0.9"} ${this._quantile(this.metrics.prediction_confidence, 0.9)}`);
            lines.push(`prediction_confidence{quantile="0.99"} ${this._quantile(this.metrics.prediction_confidence, 0.99)}`);
        }

        // Learning
        lines.push('# HELP learning_updates_total Total weight learning updates');
        lines.push('# TYPE learning_updates_total counter');
        lines.push(`learning_updates_total ${this.metrics.learning_updates_total}`);

        lines.push('# HELP weight_resets_total Total weight resets');
        lines.push('# TYPE weight_resets_total counter');
        lines.push(`weight_resets_total ${this.metrics.weight_resets_total}`);

        // Drift
        lines.push('# HELP drift_detections_total Total drift detections');
        lines.push('# TYPE drift_detections_total counter');
        lines.push(`drift_detections_total ${this.metrics.drift_detections_total}`);

        lines.push('# HELP drift_brier_score Current drift Brier score');
        lines.push('# TYPE drift_brier_score gauge');
        lines.push(`drift_brier_score ${this.metrics.drift_brier_score}`);

        lines.push('# HELP drift_hit_rate Current drift hit rate');
        lines.push('# TYPE drift_hit_rate gauge');
        lines.push(`drift_hit_rate ${this.metrics.drift_hit_rate}`);

        lines.push('# HELP drift_calibration_error Current drift calibration error');
        lines.push('# TYPE drift_calibration_error gauge');
        lines.push(`drift_calibration_error ${this.metrics.drift_calibration_error}`);

        lines.push('# HELP drift_detected Whether drift was detected in last check');
        lines.push('# TYPE drift_detected gauge');
        lines.push(`drift_detected ${this.metrics.drift_detected}`);

        // Recovery
        lines.push('# HELP recovery_actions_total Total recovery actions by type');
        lines.push('# TYPE recovery_actions_total counter');
        for (const [event, count] of this.metrics.recovery_actions_total) {
            lines.push(`recovery_actions_total{event="${event}"} ${count}`);
        }

        // API
        lines.push('# HELP api_failures_total Total API failures');
        lines.push('# TYPE api_failures_total counter');
        lines.push(`api_failures_total ${this.metrics.api_failures_total}`);

        if (this.metrics.api_latency_ms.length > 0) {
            lines.push('# HELP api_latency_ms API latency histogram');
            lines.push('# TYPE api_latency_ms summary');
            lines.push(`api_latency_ms_sum ${this.metrics.api_latency_ms.reduce((a, b) => a + b, 0)}`);
            lines.push(`api_latency_ms_count ${this.metrics.api_latency_ms.length}`);
            lines.push(`api_latency_ms{quantile="0.5"} ${this._quantile(this.metrics.api_latency_ms, 0.5)}`);
            lines.push(`api_latency_ms{quantile="0.9"} ${this._quantile(this.metrics.api_latency_ms, 0.9)}`);
            lines.push(`api_latency_ms{quantile="0.99"} ${this._quantile(this.metrics.api_latency_ms, 0.99)}`);
        }

        // DB
        lines.push('# HELP db_failures_total Total DB failures');
        lines.push('# TYPE db_failures_total counter');
        lines.push(`db_failures_total ${this.metrics.db_failures_total}`);

        lines.push('# HELP db_latency_ms Current DB latency');
        lines.push('# TYPE db_latency_ms gauge');
        lines.push(`db_latency_ms ${this.metrics.db_latency_ms}`);

        if (this.metrics.db_latency_samples.length > 0) {
            lines.push('# HELP db_latency_ms_histogram DB latency histogram');
            lines.push('# TYPE db_latency_ms_histogram summary');
            lines.push(`db_latency_ms_histogram_sum ${this.metrics.db_latency_samples.reduce((a, b) => a + b, 0)}`);
            lines.push(`db_latency_ms_histogram_count ${this.metrics.db_latency_samples.length}`);
            lines.push(`db_latency_ms_histogram{quantile="0.5"} ${this._quantile(this.metrics.db_latency_samples, 0.5)}`);
            lines.push(`db_latency_ms_histogram{quantile="0.9"} ${this._quantile(this.metrics.db_latency_samples, 0.9)}`);
            lines.push(`db_latency_ms_histogram{quantile="0.99"} ${this._quantile(this.metrics.db_latency_samples, 0.99)}`);
        }

        // System
        lines.push('# HELP ram_usage_mb Current RAM usage in MB');
        lines.push('# TYPE ram_usage_mb gauge');
        lines.push(`ram_usage_mb ${this.metrics.ram_usage_mb}`);

        lines.push('# HELP weight_mode Current weight manager mode');
        lines.push('# TYPE weight_mode gauge');
        const modeMap = { 'DB': 1, 'CACHE': 2, 'DEFAULTS': 3, 'FALLBACK_MARKET_ONLY': 4, 'FALLBACK_INTERNAL_ONLY': 5, 'UNINITIALIZED': 0 };
        lines.push(`weight_mode ${modeMap[this.metrics.weight_mode] || 0}`);

        lines.push('# HELP health_state Current health monitor state');
        lines.push('# TYPE health_state gauge');
        const stateMap = { 'HEALTHY': 1, 'DEGRADED': 2, 'RECOVERING': 3, 'RECALIBRATING': 4, 'CRITICAL': 5 };
        lines.push(`health_state ${stateMap[this.metrics.health_state] || 0}`);

        lines.push('# HELP circuit_breaker_state API circuit breaker state');
        lines.push('# TYPE circuit_breaker_state gauge');
        const circuitMap = { 'CLOSED': 1, 'OPEN': 2, 'HALF_OPEN': 3 };
        lines.push(`circuit_breaker_state ${circuitMap[this.metrics.circuit_breaker_state] || 0}`);

        lines.push('# HELP learning_updates_total Total learning updates');
        lines.push('# TYPE learning_updates_total counter');
        lines.push(`learning_updates_total ${this.metrics.learning_updates_total}`);

        lines.push('# HELP weight_resets_total Total weight resets');
        lines.push('# TYPE weight_resets_total counter');
        lines.push(`weight_resets_total ${this.metrics.weight_resets_total}`);

        lines.push('# HELP api_failures_total Total API failures');
        lines.push('# TYPE api_failures_total counter');
        lines.push(`api_failures_total ${this.metrics.api_failures_total}`);

        lines.push('# HELP db_failures_total Total DB failures');
        lines.push('# TYPE db_failures_total counter');
        lines.push(`db_failures_total ${this.metrics.db_failures_total}`);

        // Process metrics
        lines.push('# HELP process_uptime_seconds Process uptime in seconds');
        lines.push('# TYPE process_uptime_seconds gauge');
        lines.push(`process_uptime_seconds ${process.uptime()}`);

        lines.push('# HELP process_memory_bytes Process memory usage in bytes');
        lines.push('# TYPE process_memory_bytes gauge');
        const mem = process.memoryUsage();
        lines.push(`process_memory_bytes{type="heap_used"} ${mem.heapUsed}`);
        lines.push(`process_memory_bytes{type="heap_total"} ${mem.heapTotal}`);
        lines.push(`process_memory_bytes{type="rss"} ${mem.rss}`);
        lines.push(`process_memory_bytes{type="external"} ${mem.external}`);

        return lines.join('\n') + '\n';
    }

    // Express middleware for HTTP metrics
    httpMetricsMiddleware() {
        return (req, res, next) => {
            const start = Date.now();
            res.on('finish', () => {
                const latency = Date.now() - start;
                this.recordHttpRequest(req.method, req.path, res.statusCode);
            });
            next();
        };
    }
}

module.exports = new MetricsService();