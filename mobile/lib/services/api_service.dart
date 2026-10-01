import 'dart:async';
import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:cookie_jar/cookie_jar.dart';
import '../models/prediction.dart';
import '../models/user.dart';
import '../models/chat_message.dart';
import '../utils/constants.dart';
import 'storage_service.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  late final Dio _dio;
  late final CookieJar _cookieJar;
  bool _initialized = false;

  Dio get dio => _dio;

  Future<void> init() async {
    if (_initialized) return;

    _cookieJar = PersistCookieJar(storage: FileStorage('./cookies'));
    _dio = Dio(BaseOptions(
      baseUrl: AppConstants.apiBaseUrl,
      connectTimeout: AppConstants.apiTimeout,
      receiveTimeout: AppConstants.apiTimeout,
      sendTimeout: AppConstants.apiTimeout,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      validateStatus: (status) => status != null && status < 500,
    ));

    _dio.interceptors.add(CookieManager(_cookieJar));
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final storage = StorageService();
        final cookie = await storage.getAuthCookie();
        if (cookie != null) {
          options.headers['Cookie'] = cookie;
        }
        handler.next(options);
      },
      onResponse: (response, handler) async {
        final storage = StorageService();
        final setCookie = response.headers.map['set-cookie'];
        if (setCookie != null && setCookie.isNotEmpty) {
          await storage.saveAuthCookie(setCookie.first);
        }
        handler.next(response);
      },
      onError: (error, handler) {
        handler.next(error);
      },
    ));

    _initialized = true;
  }

  void setBaseUrl(String url) {
    _dio.options.baseUrl = url;
  }

  Future<T> _get<T>(String path, {Map<String, dynamic>? queryParameters, T Function(Map<String, dynamic>)? parser}) async {
    final response = await _dio.get(path, queryParameters: queryParameters);
    _checkResponse(response);
    if (parser != null) return parser(response.data);
    return response.data as T;
  }

  Future<T> _post<T>(String path, {dynamic data, Map<String, dynamic>? queryParameters, T Function(Map<String, dynamic>)? parser}) async {
    final response = await _dio.post(path, data: data, queryParameters: queryParameters);
    _checkResponse(response);
    if (parser != null) return parser(response.data);
    return response.data as T;
  }

  void _checkResponse(Response response) {
    if (response.statusCode == 401) {
      throw ApiException.unauthorized();
    }
    if (response.statusCode != null && response.statusCode! >= 400) {
      throw ApiException.fromResponse(response);
    }
  }

  Future<AuthResponse> login(String email, String password) async {
    return await _post(
      '/auth/login',
      data: {'email': email, 'password': password},
      parser: (data) => AuthResponse.fromJson(data),
    );
  }

  Future<AuthResponse> register(String username, String email, String password) async {
    return await _post(
      '/auth/register',
      data: {'username': username, 'email': email, 'password': password},
      parser: (data) => AuthResponse.fromJson(data),
    );
  }

  Future<void> logout() async {
    await _post('/auth/logout');
    await StorageService().clearAuth();
  }

  Future<PredictionsResponse> getPredictions() async {
    return await _get(
      '/predictions/api',
      parser: (data) => PredictionsResponse.fromJson(data),
    );
  }

  Future<PredictionsResponse> getRoundPredictions(int roundNumber) async {
    return await _get(
      '/predictions/api/round/$roundNumber',
      parser: (data) => PredictionsResponse.fromJson(data),
    );
  }

  Future<List<ChatMessage>> getChatMessages({int limit = 50}) async {
    return await _get(
      '/api/chat/messages',
      queryParameters: {'limit': limit},
      parser: (data) => (data as List).map((e) => ChatMessage.fromJson(e)).toList(),
    );
  }

  Future<ChatMessage> sendChatMessage(String content) async {
    return await _post(
      '/api/chat/send',
      data: {'content': content},
      parser: (data) => ChatMessage.fromJson(data),
    );
  }

  Future<void> sendTypingIndicator() async {
    await _post('/api/chat/typing', data: {});
  }

  Future<Map<String, int>> toggleReaction(int messageId, String reaction) async {
    return await _post(
      '/api/chat/react',
      data: {'messageId': messageId, 'reaction': reaction},
      parser: (data) => Map<String, int>.from(data['reactions'] ?? {}),
    );
  }

  Future<bool> healthCheck() async {
    try {
      final response = await _dio.get('/metrics');
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Future<void> updateResult({
    required String matchId,
    required int homeGoals,
    required int awayGoals,
  }) async {
    await _post('/update-result', data: {
      'match_id': matchId,
      'home_goals': homeGoals,
      'away_goals': awayGoals,
    });
  }
}

class ApiException implements Exception {
  final int? statusCode;
  final String message;
  final dynamic data;

  ApiException._(this.statusCode, this.message, this.data);

  factory ApiException.unauthorized() => ApiException._(401, 'Session expirée, veuillez vous reconnecter', null);
  factory ApiException.fromResponse(Response response) => ApiException._(
        response.statusCode,
        response.data is Map ? response.data['error']?.toString() ?? 'Erreur serveur' : 'Erreur serveur',
        response.data,
      );
  factory ApiException.network(String message) => ApiException._(null, message, null);
  factory ApiException.timeout() => ApiException._(null, 'Délai d\'attente dépassé', null);
  factory ApiException.unknown(String message) => ApiException._(null, message, null);

  @override
  String toString() => 'ApiException: $message (${statusCode ?? 'network'})';
}