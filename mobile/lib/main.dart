import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'theme/index.dart';
import 'providers/index.dart';
import 'services/api_service.dart';
import 'services/storage_service.dart';
import 'screens/splash_screen.dart';
import 'screens/home_screen.dart';
import 'screens/predictions_screen.dart';
import 'screens/match_detail_screen.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/register_screen.dart';
import 'screens/chat_screen.dart';

final apiServiceProvider = Provider<ApiService>((ref) => ApiService());
final storageServiceProvider = Provider<StorageService>((ref) => StorageService());

class UclPredictApp extends ConsumerStatefulWidget {
  const UclPredictApp({super.key});

  @override
  ConsumerState<UclPredictApp> createState() => _UclPredictAppState();
}

class _UclPredictAppState extends ConsumerState<UclPredictApp> {
  late final AppRouter _router;
  bool _isDark = false;

  @override
  void initState() {
    super.initState();
    _initTheme();
    _router = AppRouter(ref: ref);
  }

  Future<void> _initTheme() async {
    final isDark = await StorageService().getThemeMode();
    if (mounted) {
      setState(() => _isDark = isDark);
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'UCL-Predict',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: _isDark ? ThemeMode.dark : ThemeMode.light,
      routerConfig: _router.config,
      builder: (context, child) {
        return MediaQuery(
          data: MediaQuery.of(context).copyWith(textScaler: TextScaler.linear(1.0)),
          child: child!,
        );
      },
    );
  }
}

class AppRouter {
  final Ref ref;
  late final GoRouter config;

  AppRouter({required this.ref}) {
    config = GoRouter(
      initialLocation: '/splash',
      redirect: (context, state) {
        final auth = ref.read(authProvider);
        final isLoggedIn = auth.isAuthenticated;
        final isAuthRoute = state.matchedLocation == '/login' || state.matchedLocation == '/register';
        final isSplash = state.matchedLocation == '/splash';

        if (isSplash) return null;
        if (!isLoggedIn && !isAuthRoute) return '/login';
        if (isLoggedIn && isAuthRoute) return '/';
        return null;
      },
      routes: [
        GoRoute(
          path: '/splash',
          builder: (context, state) => const SplashScreen(),
        ),
        GoRoute(
          path: '/login',
          builder: (context, state) => const LoginScreen(),
        ),
        GoRoute(
          path: '/register',
          builder: (context, state) => const RegisterScreen(),
        ),
        GoRoute(
          path: '/',
          builder: (context, state) => const HomeScreen(),
        ),
        GoRoute(
          path: '/predictions',
          builder: (context, state) => const PredictionsScreen(),
        ),
        GoRoute(
          path: '/predictions/:matchId',
          builder: (context, state) {
            final matchId = state.pathParameters['matchId']!;
            return MatchDetailScreen(matchId: matchId);
          },
        ),
        GoRoute(
          path: '/chat',
          builder: (context, state) => const ChatScreen(),
        ),
      ],
    );
  }
}