import 'package:flutter/foundation.dart';
import '../models/user.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';

class AuthProvider with ChangeNotifier {
  final ApiService _api = ApiService();
  final StorageService _storage = StorageService();

  User? _user;
  bool _isLoading = false;
  String? _error;
  bool _isInitialized = false;

  User? get user => _user;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAuthenticated => _user != null;
  bool get isAdmin => _user?.isAdmin ?? false;
  bool get isInitialized => _isInitialized;

  Future<void> initialize() async {
    if (_isInitialized) return;

    final userId = await _storage.getUserId();
    final username = await _storage.getUsername();
    final role = await _storage.getUserRole();

    if (userId != null && username != null && role != null) {
      _user = User(id: userId, username: username, email: '', role: role);
    }
    _isInitialized = true;
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    _setLoading(true);
    _clearError();

    try {
      final response = await _api.login(email, password);
      if (response.success && response.user != null) {
        _user = response.user!;
        await _storage.saveUser(
          userId: _user!.id,
          username: _user!.username,
          role: _user!.role,
        );
        _setLoading(false);
        return true;
      } else {
        _setError(response.error ?? 'Identifiants invalides');
        _setLoading(false);
        return false;
      }
    } on ApiException catch (e) {
      _setError(e.message);
      _setLoading(false);
      return false;
    } catch (e) {
      _setError('Erreur de connexion: $e');
      _setLoading(false);
      return false;
    }
  }

  Future<bool> register(String username, String email, String password) async {
    _setLoading(true);
    _clearError();

    try {
      final response = await _api.register(username, email, password);
      if (response.success && response.user != null) {
        _user = response.user!;
        await _storage.saveUser(
          userId: _user!.id,
          username: _user!.username,
          role: _user!.role,
        );
        _setLoading(false);
        return true;
      } else {
        _setError(response.error ?? 'Erreur lors de l\'inscription');
        _setLoading(false);
        return false;
      }
    } on ApiException catch (e) {
      _setError(e.message);
      _setLoading(false);
      return false;
    } catch (e) {
      _setError('Erreur d\'inscription: $e');
      _setLoading(false);
      return false;
    }
  }

  Future<void> logout() async {
    _setLoading(true);
    try {
      await _api.logout();
    } catch (_) {
      // Ignore API errors on logout
    } finally {
      _user = null;
      await _storage.clearAuth();
      _setLoading(false);
    }
  }

  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  void _setError(String error) {
    _error = error;
    notifyListeners();
  }

  void _clearError() {
    _error = null;
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}