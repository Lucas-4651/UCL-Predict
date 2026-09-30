import 'package:flutter/foundation.dart';
import '../models/prediction.dart';
import '../services/api_service.dart';

class PredictionsProvider with ChangeNotifier {
  final ApiService _api = ApiService();

  List<Prediction> _predictions = [];
  String _systemState = 'UNKNOWN';
  bool _isLoading = false;
  bool _isRefreshing = false;
  String? _error;
  DateTime? _lastUpdated;

  List<Prediction> get predictions => _predictions;
  String get systemState => _systemState;
  bool get isLoading => _isLoading;
  bool get isRefreshing => _isRefreshing;
  String? get error => _error;
  DateTime? get lastUpdated => _lastUpdated;
  bool get hasData => _predictions.isNotEmpty;

  Future<void> loadPredictions({bool forceRefresh = false}) async {
    if (_isLoading && !forceRefresh) return;

    if (forceRefresh) {
      _isRefreshing = true;
    } else {
      _isLoading = true;
    }
    _clearError();
    notifyListeners();

    try {
      final response = await _api.getPredictions();
      _predictions = response.predictions;
      _systemState = response.systemState;
      _lastUpdated = DateTime.now();
      _error = null;
    } on ApiException catch (e) {
      _error = e.message;
      _predictions = [];
    } catch (e) {
      _error = 'Erreur inattendue: $e';
      _predictions = [];
    } finally {
      _isLoading = false;
      _isRefreshing = false;
      notifyListeners();
    }
  }

  Future<void> loadRoundPredictions(int roundNumber) async {
    _isLoading = true;
    _clearError();
    notifyListeners();

    try {
      final response = await _api.getRoundPredictions(roundNumber);
      _predictions = response.predictions;
      _systemState = response.systemState;
      _lastUpdated = DateTime.now();
      _error = null;
    } on ApiException catch (e) {
      _error = e.message;
      _predictions = [];
    } catch (e) {
      _error = 'Erreur inattendue: $e';
      _predictions = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> refresh() async {
    await loadPredictions(forceRefresh: true);
  }

  void _clearError() {
    _error = null;
  }

  Prediction? getPredictionByMatchId(String matchId) {
    try {
      return _predictions.firstWhere((p) => p.matchId == matchId);
    } catch (_) {
      return null;
    }
  }
}