import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../theme/index.dart';
import '../providers/predictions_provider.dart';
import '../widgets/prediction_widgets.dart';
import '../widgets/common.dart';
import 'match_detail_screen.dart';

class PredictionsScreen extends ConsumerStatefulWidget {
  const PredictionsScreen({super.key});

  @override
  ConsumerState<PredictionsScreen> createState() => _PredictionsScreenState();
}

class _PredictionsScreenState extends ConsumerState<PredictionsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(predictionsProvider.notifier).loadPredictions();
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final predictionsState = ref.watch(predictionsProvider);
    final predictions = predictionsState.predictions;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: Stack(
        children: [
          // Background pattern
          Positioned.fill(
            child: CustomPaint(
              painter: _PitchLinesPainter(theme.customColors.pitchLineColor),
            ),
          ),
          // Glow
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment.topLeft,
                  radius: 1.2,
                  colors: [
                    theme.customColors.floodlightGlowColor,
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
          // Content
          CustomScrollView(
            physics: const BouncingScrollPhysics(),
            slivers: [
              // Navigation
              SliverAppBar(
                pinned: true,
                floating: true,
                snap: true,
                elevation: 0,
                backgroundColor: theme.customColors.glassNavBg,
                surfaceTintColor: Colors.transparent,
                leadingWidth: 100,
                leading: Padding(
                  padding: const EdgeInsets.only(left: AppSpacing.md),
                  child: Row(
                    children: [
                      Icon(Icons.trophy, size: 24, color: theme.colorScheme.primary),
                      const SizedBox(width: 6),
                      Text(
                        'UCL-Predict',
                        style: AppTextStyles.titleMedium(isDark).copyWith(
                          fontFamily: 'Syne',
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
                title: Container(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.xs),
                  decoration: BoxDecoration(
                    color: _getStateColor(predictionsState.systemState, theme).withOpacity(0.15),
                    borderRadius: BorderRadius.circular(AppRadius.round),
                    border: Border.all(
                      color: _getStateColor(predictionsState.systemState, theme).withOpacity(0.3),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: _getStateColor(predictionsState.systemState, theme),
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        predictionsState.systemState,
                        style: AppTextStyles.monoSmall(isDark).copyWith(
                          color: _getStateColor(predictionsState.systemState, theme),
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
                actions: [
                  ThemeToggle(),
                  const SizedBox(width: AppSpacing.sm),
                ],
              ),

              // Header
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(AppSpacing.lg),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Prédictions Champions League',
                        style: AppTextStyles.headlineMedium(isDark),
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        'Terminal de données en temps réel — Moteur Adaptatif UCL-Predict',
                        style: AppTextStyles.bodyMedium(isDark).copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                      if (predictionsState.lastUpdated != null) ...[
                        const SizedBox(height: AppSpacing.xs),
                        Text(
                          'Dernière mise à jour: ${_formatTime(predictionsState.lastUpdated!)}',
                          style: AppTextStyles.monoSmall(isDark).copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),

              // Predictions List
              if (predictionsState.isLoading && predictions.isEmpty)
                const SliverFillRemaining(
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (predictionsState.error != null)
                SliverFillRemaining(
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpacing.xl),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          AppErrorMessage(
                            message: predictionsState.error!,
                            onDismiss: () => ref.read(predictionsProvider.notifier).refresh(),
                          ),
                          const SizedBox(height: AppSpacing.lg),
                          PrimaryButton(
                            label: 'Réessayer',
                            onPressed: () => ref.read(predictionsProvider.notifier).refresh(),
                          ),
                        ],
                      ),
                    ),
                  ),
                )
              else if (predictions.isEmpty)
                SliverFillRemaining(
                  child: EmptyState(
                    icon: Icons.sports_soccer_outlined,
                    title: 'Aucune prédiction',
                    subtitle: 'Aucun match programmé pour le moment.',
                    action: PrimaryButton(
                      label: 'Actualiser',
                      onPressed: () => ref.read(predictionsProvider.notifier).refresh(),
                    ),
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                  sliver: SliverList.separated(
                    itemCount: predictions.length,
                    separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
                    itemBuilder: (context, index) {
                      final prediction = predictions[index];
                      return PredictionCard(
                        prediction: prediction,
                        onTap: () => context.go('/predictions/${prediction.matchId ?? prediction.match}'),
                      );
                    },
                  ),
                ),

              // Bottom padding for FAB
              const SliverToBoxAdapter(child: SizedBox(height: 100)),
            ],
          ),

          // Floating Refresh Button
          Positioned(
            bottom: 24,
            right: 24,
            child: RefreshFAB(
              onPressed: () => ref.read(predictionsProvider.notifier).refresh(),
              isLoading: predictionsState.isRefreshing,
            ),
          ),
        ],
      ),
    );
  }

  Color _getStateColor(String state, ThemeData theme) {
    switch (state) {
      case 'HEALTHY':
        return theme.colorScheme.primary;
      case 'DEGRADED':
        return theme.colorScheme.warning;
      default:
        return theme.colorScheme.error;
    }
  }

  String _formatTime(DateTime dt) {
    return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
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