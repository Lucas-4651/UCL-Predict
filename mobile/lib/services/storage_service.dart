import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../utils/constants.dart';

class StorageService {
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
      resetOnError: true,
    ),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
    ),
  );

  // Auth
  static Future<void> saveAuthCookie(String cookie) async {
    await _storage.write(key: AppConstants.storageKeyAuthCookie, value: cookie);
  }

  static Future<String?> getAuthCookie() async {
    return await _storage.read(key: AppConstants.storageKeyAuthCookie);
  }

  static Future<void> saveUser({
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

  static Future<int?> getUserId() async {
    final value = await _storage.read(key: AppConstants.storageKeyUserId);
    return value != null ? int.tryParse(value) : null;
  }

  static Future<String?> getUsername() async {
    return await _storage.read(key: AppConstants.storageKeyUsername);
  }

  static Future<String?> getUserRole() async {
    return await _storage.read(key: AppConstants.storageKeyUserRole);
  }

  static Future<void> clearAuth() async {
    await Future.wait([
      _storage.delete(key: AppConstants.storageKeyAuthCookie),
      _storage.delete(key: AppConstants.storageKeyUserId),
      _storage.delete(key: AppConstants.storageKeyUsername),
      _storage.delete(key: AppConstants.storageKeyUserRole),
    ]);
  }

  // Theme
  static Future<void> saveThemeMode(bool isDark) async {
    await _storage.write(key: AppConstants.storageKeyTheme, value: isDark.toString());
  }

  static Future<bool> getThemeMode() async {
    final value = await _storage.read(key: AppConstants.storageKeyTheme);
    return value == 'true';
  }

  // Generic
  static Future<void> write(String key, String value) async {
    await _storage.write(key: key, value: value);
  }

  static Future<String?> read(String key) async {
    return await _storage.read(key: key);
  }

  static Future<void> delete(String key) async {
    await _storage.delete(key: key);
  }

  static Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}