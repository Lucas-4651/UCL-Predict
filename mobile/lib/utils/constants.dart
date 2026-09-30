class AppConstants {
  static const String baseUrl = 'https://votre-domaine.com';
  static const String apiBaseUrl = '$baseUrl';
  static const String wsBaseUrl = 'wss://votre-domaine.com';

  static const Duration apiTimeout = Duration(seconds: 15);
  static const Duration sseReconnectDelay = Duration(seconds: 5);
  static const int maxSseReconnectAttempts = 10;

  static const String leagueName = 'Champions League';
  static const int leagueId = 8056;

  static const String storageKeyAuthCookie = 'auth_cookie';
  static const String storageKeyUserId = 'user_id';
  static const String storageKeyUsername = 'username';
  static const String storageKeyUserRole = 'user_role';
  static const String storageKeyTheme = 'theme_mode';

  static const String routeHome = '/';
  static const String routePredictions = '/predictions';
  static const String routeMatchDetail = '/predictions/:matchId';
  static const String routeLogin = '/login';
  static const String routeRegister = '/register';
  static const String routeChat = '/chat';
  static const String routeSplash = '/splash';
}