import 'package:flutter/material.dart';
import '../../models/prediction.dart';
import '../../theme/index.dart';
import 'cards.dart';

class ConfidenceBar extends StatelessWidget {
  final double confidence;
  final Color? color;
  final double height;
  final bool showPercentage;
  final TextStyle? percentageStyle;

  const ConfidenceBar({
    super.key,
    required this.confidence,
    this.color,
    this.height = 6,
    this.showPercentage = true,
    this.percentageStyle,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final barColor = color ?? theme.colorScheme.primary;
    final bgColor = barColor.withOpacity(0.15);
    final percentage = (confidence * 100).round();

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (showPercentage)
          Padding(
            padding: const EdgeInsets.only(right: AppSpacing.xs),
            child: Text(
              '$percentage%',
              style: percentageStyle ?? AppTextStyles.monoXSmall(isDark).copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ),
        SizedBox(
          width: 48,
          height: height,
          child: Stack(
            children: [
              Container(
                decoration: BoxDecoration(
                  color: bgColor,
                  borderRadius: BorderRadius.circular(AppRadius.round),
                ),
              ),
              FractionallySizedBox(
                widthFactor: confidence.clamp(0.0, 1.0),
                child: Container(
                  decoration: BoxDecoration(
                    color: barColor,
                    borderRadius: BorderRadius.circular(AppRadius.round),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class MarketChip extends StatelessWidget {
  final String label;
  final String value;
  final double confidence;
  final IconData? icon;
  final Color? valueColor;
  final bool compact;

  const MarketChip({
    super.key,
    required this.label,
    required this.value,
    required this.confidence,
    this.icon,
    this.valueColor,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? AppSpacing.sm : AppSpacing.md,
        vertical: compact ? AppSpacing.xs : AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withOpacity(0.5),
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: theme.customColors.scorecardBorder, width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: compact ? 12 : 14, color: theme.colorScheme.onSurfaceVariant),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: AppTextStyles.monoXSmall(isDark).copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            value,
            style: (compact ? AppTextStyles.monoSmall : AppTextStyles.monoMedium)(isDark).copyWith(
              color: valueColor ?? theme.colorScheme.primary,
              fontWeight: FontWeight.bold,
            ),
          ),
          if (!compact) ...[
            const SizedBox(width: 6),
            ConfidenceBar(
              confidence: confidence,
              height: 4,
              showPercentage: true,
              percentageStyle: AppTextStyles.monoXSmall(isDark),
            ),
          ],
        ],
      ),
    );
  }
}

class OddsRow extends StatelessWidget {
  final Odds odds;
  final bool compact;

  const OddsRow({
    super.key,
    required this.odds,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? AppSpacing.sm : AppSpacing.md,
        vertical: compact ? AppSpacing.xs : AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withOpacity(0.3),
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: theme.customColors.scorecardBorder, width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _OddsItem(label: '1', value: odds.home.toStringAsFixed(2), isDark: isDark, theme: theme),
          Container(
            width: 1,
            height: compact ? 12 : 16,
            color: theme.customColors.scorecardBorder,
            margin: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
          ),
          _OddsItem(label: 'X', value: odds.draw.toStringAsFixed(2), isDark: isDark, theme: theme),
          Container(
            width: 1,
            height: compact ? 12 : 16,
            color: theme.customColors.scorecardBorder,
            margin: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
          ),
          _OddsItem(label: '2', value: odds.away.toStringAsFixed(2), isDark: isDark, theme: theme),
        ],
      ),
    );
  }
}

class _OddsItem extends StatelessWidget {
  final String label;
  final String value;
  final bool isDark;
  final ThemeData theme;

  const _OddsItem({
    required this.label,
    required this.value,
    required this.isDark,
    required this.theme,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          '$label:',
          style: AppTextStyles.monoXSmall(isDark).copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(width: 2),
        Text(
          value,
          style: AppTextStyles.monoSmall(isDark).copyWith(
            color: theme.colorScheme.onSurface,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }
}

class PredictionCard extends StatelessWidget {
  final Prediction prediction;
  final VoidCallback? onTap;

  const PredictionCard({
    super.key,
    required this.prediction,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return AppCardHover(
      onTap: onTap,
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 4,
                height: 40,
                decoration: BoxDecoration(
                  color: theme.colorScheme.primary,
                  borderRadius: BorderRadius.circular(AppRadius.round),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(
                  prediction.match,
                  style: AppTextStyles.titleMedium(isDark).copyWith(
                    fontFamily: 'Syne',
                    fontWeight: FontWeight.w700,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: [
              MarketChip(
                label: '1X2',
                value: prediction.outcomeName,
                confidence: prediction.outcomeConf,
                icon: Icons.sports_soccer,
              ),
              MarketChip(
                label: 'BTTS',
                value: prediction.btts,
                confidence: prediction.bttsConf,
                icon: Icons.timer,
                valueColor: prediction.btts == 'Yes'
                    ? theme.colorScheme.primary
                    : theme.colorScheme.onSurfaceVariant,
              ),
              MarketChip(
                label: 'O/U',
                value: prediction.ou,
                confidence: prediction.ouConf,
                icon: Icons.trending_up,
                valueColor: prediction.ou == 'Over'
                    ? theme.colorScheme.primary
                    : theme.colorScheme.onSurfaceVariant,
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          OddsRow(odds: prediction.odds),
        ],
      ),
    );
  }
}

class PredictionSkeleton extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final baseColor = theme.colorScheme.surfaceContainerHighest;
    final highlightColor = theme.colorScheme.surfaceContainerHigh;

    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        children: [
          Row(
            children: [
              _ShimmerBox(width: 4, height: 40, baseColor: baseColor, highlightColor: highlightColor),
              const SizedBox(width: AppSpacing.sm),
              _ShimmerBox(width: 180, height: 20, baseColor: baseColor, highlightColor: highlightColor),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: List.generate(3, (i) => _ShimmerBox(
              width: 100,
              height: 36,
              baseColor: baseColor,
              highlightColor: highlightColor,
              borderRadius: AppRadius.lg,
            )),
          ),
          const SizedBox(height: AppSpacing.md),
          _ShimmerBox(width: 120, height: 32, baseColor: baseColor, highlightColor: highlightColor, borderRadius: AppRadius.lg),
        ],
      ),
    );
  }
}

class _ShimmerBox extends StatefulWidget {
  final double width;
  final double height;
  final Color baseColor;
  final Color highlightColor;
  final double borderRadius;

  const _ShimmerBox({
    required this.width,
    required this.height,
    required this.baseColor,
    required this.highlightColor,
    this.borderRadius = 8,
  });

  @override
  State<_ShimmerBox> createState() => _ShimmerBoxState();
}

class _ShimmerBoxState extends State<_ShimmerBox> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    )..repeat(reverse: true);
    _animation = Tween<double>(begin: -1.0, end: 2.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(widget.borderRadius),
            gradient: LinearGradient(
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
              colors: [
                widget.baseColor,
                widget.highlightColor,
                widget.baseColor,
              ],
              stops: [
                (_animation.value - 0.3).clamp(0.0, 1.0),
                _animation.value.clamp(0.0, 1.0),
                (_animation.value + 0.3).clamp(0.0, 1.0),
              ],
            ),
          ),
        );
      },
    );
  }
}