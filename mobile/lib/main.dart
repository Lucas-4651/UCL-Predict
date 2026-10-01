import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'theme/index.dart';
import 'providers/auth_provider.dart';
import 'providers/predictions_provider.dart';
import 'providers/chat_provider.dart';
import 'services/storage_service.dart';
import 'screens/splash_screen.dart';
import 'screens/home_screen.dart';
import 'screens/predictions_screen.dart';
import 'screens/match_detail_screen.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/register_screen.dart';
import 'screens/chat_screen.dart';

void main() {
  runApp(const UclPredictApp());
}

class UclPredictApp extends StatefulWidget {
  const UclPredictApp({super.key});

  @override
  State<UclPredictApp> createState() => _UclPredictAppState();
}

class _UclPredictAppState extends State<UclPredictApp> {
  bool _isDark = false;

  @override
  void initState() {
    super.initState();
    _initTheme();
  }

  Future<void> _initTheme() async {
    final isDark = await StorageService().getThemeMode();
    if (mounted) {
      setState(() => _isDark = isDark);
    }
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => PredictionsProvider()),
        ChangeNotifierProvider(create: (_) => ChatProvider()),
      ],
      child: MaterialApp.router(
        title: 'UCL-Predict',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: _isDark ? ThemeMode.dark : ThemeMode.light,
        routerConfig: _router,
        builder: (context, child) {
          return MediaQuery(
            data: MediaQuery.of(context).copyWith(textScaler: TextScaler.linear(1.0)),
            child: child!,
          );
        },
      ),
    );
  }
}

final GoRouter _router = GoRouter(
  initialLocation: '/splash',
  redirect: (context, state) {
    final auth = context.read<AuthProvider>();
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
