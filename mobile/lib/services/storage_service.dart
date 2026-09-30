import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../utils/constants.dart';

class StorageService {
  static final StorageService _instance = StorageService._internal();
  factory StorageService() => _instance;
  StorageService._internal();

  final _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
      resetOnError: true,
    ),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
    ),
  );

  // Auth
  Future<void> saveAuthCookie(String cookie) async {
    await _storage.write(key: AppConstants.storageKeyAuthCookie, value: cookie);
  }

  Future<String?> getAuthCookie() async {
    return await _storage.read(key: AppConstants.storageKeyAuthCookie);
  }

  Future<void> saveUser({
    required int userId,
    required String username,
    required String role,
  }) async {
    await Future.wait([
      _storage.write(key: AppConstants.storageKeyUserId, value: userId.toString()),
      _storage.write(key: AppConstants.storageKeyUsername, value: username),
      _storage.write(key: AppConstants.storageKeyUserRole, value: role),
    ]);
  }

  Future<int?> getUserId() async {
    final value = await _storage.read(key: AppConstants.storageKeyUserId);
    return value != null ? int.tryParse(value) : null;
  }

  Future<String?> getUsername() async {
    return await _storage.read(key: AppConstants.storageKeyUsername);
  }

  Future<String?> getUserRole() async {
    return await _storage.read(key: AppConstants.storageKeyUserRole);
  }

  Future<void> clearAuth() async {
    await Future.wait([
      _storage.delete(key: AppConstants.storageKeyAuthCookie),
      _storage.delete(key: AppConstants.storageKeyUserId),
      _storage.delete(key: AppConstants.storageKeyUsername),
      _storage.delete(key: AppConstants.storageKeyUserRole),
    ]);
  }

  // Theme
  Future<void> saveThemeMode(bool isDark) async {
    await _storage.write(key: AppConstants.storageKeyTheme, value: isDark.toString());
  }

  Future<bool> getThemeMode() async {
    final value = await _storage.read(key: AppConstants.storageKeyTheme);
    return value == 'true';
  }

  // Generic
  Future<void> write(String key, String value) async {
    await _storage.write(key: key, value: value);
  }

  Future<String?> read(String key) async {
    return await _storage.read(key: key);
  }

  Future<void> delete(String key) async {
    await _storage.delete(key: key);
  }

  Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}