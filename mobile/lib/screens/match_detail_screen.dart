import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/index.dart';
import '../providers/predictions_provider.dart';
import '../widgets/index.dart';
import '../models/prediction.dart';

class MatchDetailScreen extends StatelessWidget {
  final String matchId;

  const MatchDetailScreen({super.key, required this.matchId});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final customColors = theme.extension<AppCustomColors>()!;
    final predictionsState = context.watch<PredictionsProvider>();
    final prediction = predictionsState.predictions.firstWhere(
      (p) => (p.matchId ?? p.match) == matchId,
      orElse: () => throw StateError('Prediction not found'),
    );

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
            slivers: _buildSlivers(context, theme, isDark, customColors, prediction),
          ),
        ],
      ),
    );
  }

  List<Widget> _buildSlivers(
    BuildContext context,
    ThemeData theme,
    bool isDark,
    AppCustomColors customColors,
    Prediction prediction,
  ) {
    final slivers = <Widget>[
      SliverAppBar(
        pinned: true,
        floating: true,
        snap: true,
        elevation: 0,
        backgroundColor: customColors.glassNavBg,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: Icon(Icons.arrow_back, color: theme.colorScheme.onSurface),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'Détail du Match',
          style: AppTextStyles.titleMedium(isDark),
        ),
      ),
      SliverToBoxAdapter(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(AppSpacing.xl),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      theme.colorScheme.primaryContainer,
                      theme.colorScheme.primaryContainer.withValues(opacity: 0.5),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(AppRadius.xxl),
                  border: Border.all(
                    color: theme.colorScheme.primary.withValues(opacity: 0.2),
                  ),
                ),
                child: Column(
                  children: [
                    Text(
                      prediction.match,
                      style: AppTextStyles.headlineMedium(isDark).copyWith(
                        fontWeight: FontWeight.w800,
                        color: theme.colorScheme.onPrimaryContainer,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: AppSpacing.md),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _DetailStat(
                          label: 'Confiance 1X2',
                          value: '${(prediction.outcomeConf * 100).round()}%',
                          color: theme.colorScheme.primary,
                          isDark: isDark,
                        ),
                        _DetailStat(
                          label: 'Confiance BTTS',
                          value: '${(prediction.bttsConf * 100).round()}%',
                          color: prediction.btts == 'Yes' ? Colors.green : Colors.orange,
                          isDark: isDark,
                        ),
                        _DetailStat(
                          label: 'Confiance O/U',
                          value: '${(prediction.ouConf * 100).round()}%',
                          color: prediction.ou == 'Over' ? Colors.red : Colors.blue,
                          isDark: isDark,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
              Text('Marchés', style: AppTextStyles.headlineSmall(isDark)),
              const SizedBox(height: AppSpacing.md),
              _MarketDetailCard(
                title: '1X2 - Résultat du Match',
                icon: Icons.sports_soccer,
                prediction: prediction.outcomeName,
                confidence: prediction.outcomeConf,
                probabilities: prediction.probabilities.outcome,
                odds: prediction.odds,
                isDark: isDark,
                theme: theme,
              ),
              const SizedBox(height: AppSpacing.md),
              _MarketDetailCard(
                title: 'BTTS - Les Deux Équipes Marquent',
                icon: Icons.timer,
                prediction: prediction.btts,
                confidence: prediction.bttsConf,
                probabilities: prediction.probabilities.btts,
                isDark: isDark,
                theme: theme,
                showOdds: false,
              ),
              const SizedBox(height: AppSpacing.md),
              _MarketDetailCard(
                title: 'Over/Under 2.5 Buts',
                icon: Icons.trending_up,
                prediction: prediction.ou,
                confidence: prediction.ouConf,
                probabilities: prediction.probabilities.ou,
                isDark: isDark,
                theme: theme,
                showOdds: false,
              ),
              const SizedBox(height: AppSpacing.xl),
              Text('Détails Techniques', style: AppTextStyles.headlineSmall(isDark)),
              const SizedBox(height: AppSpacing.md),
              AppCard(
                padding: const EdgeInsets.all(AppSpacing.lg),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Poissons (λ)', style: AppTextStyles.titleSmall(isDark)),
                    const SizedBox(height: AppSpacing.sm),
                    Row(
                      children: [
                        Expanded(
                          child: _LambdaRow(
                            label: 'λ Domicile',
                            value: prediction.lambdas.home.toStringAsFixed(2),
                            isDark: isDark,
                            theme: theme,
                          ),
                        ),
                        Expanded(
                          child: _LambdaRow(
                            label: 'λ Extérieur',
                            value: prediction.lambdas.away.toStringAsFixed(2),
                            isDark: isDark,
                            theme: theme,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    Text('Facteurs', style: AppTextStyles.titleSmall(isDark)),
                    const SizedBox(height: AppSpacing.sm),
                    Wrap(
                      spacing: AppSpacing.sm,
                      runSpacing: AppSpacing.sm,
                      children: prediction.factors.entries.map((e) {
                        return Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.md,
                            vertical: AppSpacing.xs,
                          ),
                          decoration: BoxDecoration(
                            color: theme.colorScheme.surfaceContainerHighest,
                            borderRadius: BorderRadius.circular(AppRadius.round),
                          ),
                          child: Text(
                            '${e.key}: ${e.value.toStringAsFixed(3)}',
                            style: AppTextStyles.monoSmall(isDark),
                          ),
                        );
                      }).toList(),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.xxxl),
            ],
          ),
        ),
      ),
    ];
    return slivers;
  }
}

class _DetailStat extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  final bool isDark;

  const _DetailStat({
    required this.label,
    required this.value,
    required this.color,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
      child: Column(
        children: [
          Text(value, style: AppTextStyles.monoMedium(isDark).copyWith(color: color, fontWeight: FontWeight.bold)),
          const SizedBox(height: 2),
          Text(label, style: AppTextStyles.monoXSmall(isDark).copyWith(color: color.withValues(opacity: 0.7))),
        ],
      ),
    );
  }
}

class _MarketDetailCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final String prediction;
  final double confidence;
  final Map<String, double> probabilities;
  final bool isDark;
  final ThemeData theme;
  final Odds? odds;
  final bool showOdds;

  const _MarketDetailCard({
    required this.title,
    required this.icon,
    required this.prediction,
    required this.confidence,
    required this.probabilities,
    required this.isDark,
    required this.theme,
    this.odds,
    this.showOdds = true,
  });

  @override
  Widget build(BuildContext context) {
    final predictionColor = _getPredictionColor(prediction);

    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: predictionColor.withValues(opacity: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, size: 22, color: predictionColor),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: AppTextStyles.titleMedium(isDark)),
                    Text(
                      'Prédiction: $prediction (${(confidence * 100).round()}%)',
                      style: AppTextStyles.bodyMedium(isDark).copyWith(
                        color: predictionColor,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              ConfidenceBar(confidence: confidence, color: predictionColor, height: 8),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          Text('Probabilités', style: AppTextStyles.labelMedium(isDark)),
          const SizedBox(height: AppSpacing.sm),
          ...probabilities.entries.map((e) => _ProbabilityBar(
            label: e.key,
            value: e.value,
            isPredicted: e.key == prediction,
            color: predictionColor,
            isDark: isDark,
            theme: theme,
          )),
          if (showOdds && odds != null) ...[
            const SizedBox(height: AppSpacing.lg),
            Text('Cotes', style: AppTextStyles.labelMedium(isDark)),
            const SizedBox(height: AppSpacing.sm),
            OddsRow(odds: odds!),
          ],
        ],
      ),
    );
  }

  Color _getPredictionColor(String prediction) {
    switch (prediction) {
      case '1':
      case 'Yes':
      case 'Over':
        return theme.colorScheme.primary;
      case 'X':
        return Colors.orange;
      case '2':
      case 'No':
      case 'Under':
        return theme.colorScheme.error;
      default:
        return theme.colorScheme.onSurfaceVariant;
    }
  }
}

class _ProbabilityBar extends StatelessWidget {
  final String label;
  final double value;
  final bool isPredicted;
  final Color color;
  final bool isDark;
  final ThemeData theme;

  const _ProbabilityBar({
    required this.label,
    required this.value,
    required this.isPredicted,
    required this.color,
    required this.isDark,
    required this.theme,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          SizedBox(
            width: 40,
            child: Text(
              label,
              style: AppTextStyles.monoMedium(isDark).copyWith(
                color: isPredicted ? color : theme.colorScheme.onSurfaceVariant,
                fontWeight: isPredicted ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ),
          Expanded(
            child: Stack(
              children: [
                Container(
                  height: 8,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(AppRadius.round),
                  ),
                ),
                FractionallySizedBox(
                  widthFactor: value.clamp(0.0, 1.0),
                  child: Container(
                    height: 8,
                    decoration: BoxDecoration(
                      color: isPredicted ? color : theme.colorScheme.onSurfaceVariant.withValues(opacity: 0.4),
                      borderRadius: BorderRadius.circular(AppRadius.round),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          SizedBox(
            width: 45,
            child: Text(
              '${(value * 100).round()}%',
              style: AppTextStyles.monoSmall(isDark).copyWith(
                color: isPredicted ? color : theme.colorScheme.onSurfaceVariant,
                fontWeight: isPredicted ? FontWeight.bold : FontWeight.normal,
              ),
              textAlign: TextAlign.end,
            ),
          ),
        ],
      ),
    );
  }
}

class _LambdaRow extends StatelessWidget {
  final String label;
  final String value;
  final bool isDark;
  final ThemeData theme;

  const _LambdaRow({
    required this.label,
    required this.value,
    required this.isDark,
    required this.theme,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: AppTextStyles.monoSmall(isDark).copyWith(color: theme.colorScheme.onSurfaceVariant)),
        const SizedBox(height: 2),
        Text(value, style: AppTextStyles.monoMedium(isDark).copyWith(fontWeight: FontWeight.bold)),
      ],
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