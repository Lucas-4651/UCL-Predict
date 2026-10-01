import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../theme/index.dart';
import '../providers/auth_provider.dart';
import '../providers/predictions_provider.dart';
import '../widgets/index.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';
import 'predictions_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  String _systemState = 'CHECKING...';

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    )..forward();
    _checkSystemHealth();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _checkSystemHealth() async {
    try {
      final api = ApiService();
      await api.init();
      final healthy = await api.healthCheck();
      if (mounted) {
        setState(() => _systemState = healthy ? 'HEALTHY' : 'DEGRADED');
      }
    } catch (_) {
      if (mounted) {
        setState(() => _systemState = 'OFFLINE');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final customColors = theme.extension<AppCustomColors>()!;
    final authState = context.watch<AuthProvider>();
    final user = authState.user;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: Stack(
        children: [
          Positioned.fill(
            child: CustomPaint(
              painter: _PitchLinesPainter(customColors.pitchLineColor),
            ),
          ),
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment.topCenter,
                  radius: 1.5,
                  colors: [
                    customColors.floodlightGlowColor,
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
          CustomScrollView(
            physics: const BouncingScrollPhysics(),
            slivers: [
              SliverAppBar(
                pinned: true,
                floating: true,
                snap: true,
                elevation: 0,
                backgroundColor: customColors.glassNavBg,
                surfaceTintColor: Colors.transparent,
                title: Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: theme.colorScheme.primary,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(
                            color: theme.colorScheme.primary.withOpacity(0.4),
                            blurRadius: 15,
                            spreadRadius: -2,
                          ),
                        ],
                      ),
                      child: const Icon(Icons.emoji_events, size: 20, color: Colors.white),
                    ),
                    const SizedBox(width: 10),
                    RichText(
                      text: TextSpan(
                        style: AppTextStyles.titleMedium(isDark),
                        children: [
                          const TextSpan(text: 'UCL-Predict '),
                          TextSpan(
                            text: 'Predict',
                            style: TextStyle(color: theme.colorScheme.primary),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                actions: [
                  Consumer(
                    builder: (context, ref, _) {
                      return ThemeToggle(
                        onChanged: (isDark) async {
                          await StorageService().saveThemeMode(isDark);
                        },
                      );
                    },
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  if (user != null) ...[
                    PopupMenuButton<String>(
                      icon: CircleAvatar(
                        radius: 16,
                        backgroundColor: theme.colorScheme.primaryContainer,
                        child: Text(
                          user.username[0].toUpperCase(),
                          style: TextStyle(
                            color: theme.colorScheme.primary,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                      ),
                      onSelected: (value) {
                        if (value == 'logout') {
                          context.read<AuthProvider>().logout();
                        }
                      },
                      itemBuilder: (context) => [
                        PopupMenuItem(
                          value: 'profile',
                          child: Row(
                            children: [
                              const Icon(Icons.person_outline, size: 18),
                              const SizedBox(width: 8),
                              Text(user.username),
                            ],
                          ),
                        ),
                        if (user.isAdmin)
                          const PopupMenuItem(
                            value: 'admin',
                            child: Row(
                              children: [
                                const Icon(Icons.admin_panel_settings_outlined, size: 18),
                                const SizedBox(width: 8),
                                Text('Admin Panel'),
                              ],
                            ),
                          ),
                        const PopupMenuItem(
                          value: 'logout',
                          child: Row(
                            children: [
                              const Icon(Icons.logout, size: 18),
                              const SizedBox(width: 8),
                              Text('Déconnexion'),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ] else ...[
                    TextButton(
                      onPressed: () => context.go('/login'),
                      child: Text('Connexion', style: AppTextStyles.labelMedium(isDark)),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    PrimaryButton(
                      label: 'S\'inscrire',
                      onPressed: () => context.go('/register'),
                      fullWidth: false,
                    ),
                  ],
                  const SizedBox(width: AppSpacing.md),
                ],
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(AppSpacing.xl),
                  child: Column(
                    children: [
                      const SizedBox(height: AppSpacing.xl),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.lg,
                          vertical: AppSpacing.sm,
                        ),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primaryContainer,
                          borderRadius: BorderRadius.circular(AppRadius.round),
                          border: Border.all(
                            color: theme.colorScheme.primary.withOpacity(0.2),
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color: theme.colorScheme.primary,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'Moteur Hybride v4.0 Actif',
                              style: AppTextStyles.labelSmall(isDark).copyWith(
                                color: theme.colorScheme.primary,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xl),
                      ShaderMask(
                        shaderCallback: (bounds) => LinearGradient(
                          colors: [theme.colorScheme.onSurface, theme.colorScheme.primary],
                        ).createShader(bounds),
                        child: Text(
                          'L\'IA qui\ndécode le football',
                          style: AppTextStyles.displayLarge(isDark).copyWith(
                            height: 1.1,
                            color: Colors.white,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
                        child: Text(
                          'Fusion de données en temps réel et d\'heuristiques adaptatives. '
                          'UCL-Predict transforme le chaos des statistiques en probabilités mathématiques pures.',
                          style: AppTextStyles.bodyLarge(isDark).copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                            height: 1.6,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xl),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          PrimaryButton(
                            label: 'Voir les Prédictions',
                            leadingIcon: Icons.analytics_outlined,
                            onPressed: () => context.go('/predictions'),
                            fullWidth: false,
                          ),
                          const SizedBox(width: AppSpacing.md),
                          SecondaryButton(
                            label: 'Créer un compte',
                            onPressed: () => context.go('/register'),
                            fullWidth: false,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: AppSpacing.xl),
                      Text(
                        'Pourquoi UCL-Predict ?',
                        style: AppTextStyles.headlineMedium(isDark),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        'L\'époque des pronostics "au feeling" est terminée. Bienvenue dans l\'ère de la prédiction algorithmique.',
                        style: AppTextStyles.bodyMedium(isDark).copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xl),
                      GridView.count(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        crossAxisCount: 2,
                        mainAxisSpacing: AppSpacing.md,
                        crossAxisSpacing: AppSpacing.md,
                        childAspectRatio: 1.1,
                        children: [
                          _FeatureCard(
                            icon: Icons.psychology_outlined,
                            color: theme.colorScheme.primary,
                            title: 'Hybrid AI Engine',
                            description: 'Fusion marché + heuristiques sportives pour éliminer les biais.',
                          ),
                          _FeatureCard(
                            icon: Icons.healing_outlined,
                            color: theme.colorScheme.tertiary,
                            title: 'Auto-Healing',
                            description: 'Architecture résiliente avec auto-diagnostic et réparation.',
                          ),
                          _FeatureCard(
                            icon: Icons.school_outlined,
                            color: Colors.amber,
                            title: 'Learning Loop',
                            description: 'L\'algorithme apprend de chaque erreur pour s\'optimiser.',
                          ),
                          _FeatureCard(
                            icon: Icons.speed_outlined,
                            color: Colors.orange,
                            title: 'Temps Réel',
                            description: 'Prédictions précalculées (R+1) pour fenêtre de pari complète.',
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.xxxl),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _FeatureCard extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;
  final String description;

  const _FeatureCard({
    required this.icon,
    required this.color,
    required this.title,
    required this.description,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return AppCardHover(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color.withOpacity(0.15),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(icon, size: 28, color: color),
          ),
          const SizedBox(height: AppSpacing.md),
          Text(title, style: AppTextStyles.titleMedium(isDark)),
          const SizedBox(height: AppSpacing.xs),
          Text(
            description,
            style: AppTextStyles.bodySmall(isDark).copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

class _PitchLinesPainter extends CustomPainter {
  final Color color;
  _PitchLinesPainter(this.color);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color..strokeWidth = 0.5;
    const spacing = 60.0;
    for (double x = 0; x < size.width; x += spacing) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (double y = 0; y < size.height; y += spacing) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}