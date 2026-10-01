import 'package:flutter/material.dart';
import '../theme/index.dart';

class AppCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final VoidCallback? onTap;
  final Color? backgroundColor;
  final BorderRadius? borderRadius;
  final List<BoxShadow>? shadows;
  final BorderSide? border;

  const AppCard({
    super.key,
    required this.child,
    this.padding,
    this.onTap,
    this.backgroundColor,
    this.borderRadius,
    this.shadows,
    this.border,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final card = Container(
      padding: padding ?? const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: backgroundColor ?? theme.cardColor,
        borderRadius: borderRadius ?? BorderRadius.circular(AppRadius.xl),
        border: border != null 
            ? Border.fromBorderSide(border!) 
            : Border.fromBorderSide(BorderSide(
                color: theme.extension<AppCustomColors>()!.scorecardBorder,
                width: 1,
              )),
        boxShadow: shadows ?? AppShadows.cardShadow(isDark),
      ),
      child: child,
    );

    if (onTap != null) {
      return InkWell(
        onTap: onTap,
        borderRadius: borderRadius ?? BorderRadius.circular(AppRadius.xl),
        child: card,
      );
    }

    return card;
  }
}

class AppCardHover extends StatefulWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final VoidCallback? onTap;
  final Color? backgroundColor;
  final BorderRadius? borderRadius;

  const AppCardHover({
    super.key,
    required this.child,
    this.padding,
    this.onTap,
    this.backgroundColor,
    this.borderRadius,
  });

  @override
  State<AppCardHover> createState() => _AppCardHoverState();
}

class _AppCardHoverState extends State<AppCardHover> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: AnimatedContainer(
        duration: AppDurations.normal,
        curve: AppCurves.standard,
        padding: widget.padding ?? const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: _isHovered
              ? theme.extension<AppCustomColors>()!.scorecardHoverBg
              : (widget.backgroundColor ?? theme.cardColor),
          borderRadius: widget.borderRadius ?? BorderRadius.circular(AppRadius.xl),
          border: Border.fromBorderSide(BorderSide(
            color: _isHovered
                ? theme.extension<AppCustomColors>()!.scorecardHoverBorder
                : theme.extension<AppCustomColors>()!.scorecardBorder,
            width: 1,
          )),
          boxShadow: _isHovered
              ? AppShadows.cardHoverShadow(isDark)
              : AppShadows.cardShadow(isDark),
        ),
        child: widget.onTap != null
            ? InkWell(
                onTap: widget.onTap,
                borderRadius: widget.borderRadius ?? BorderRadius.circular(AppRadius.xl),
                child: widget.child,
              )
            : widget.child,
      ),
    );
  }
}

class GlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final VoidCallback? onTap;
  final BorderRadius? borderRadius;

  const GlassCard({
    super.key,
    required this.child,
    this.padding,
    this.onTap,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final card = Container(
      padding: padding ?? const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: theme.extension<AppCustomColors>()!.glassNavBg,
        borderRadius: borderRadius ?? BorderRadius.circular(AppRadius.xl),
        border: Border.fromBorderSide(BorderSide(
          color: theme.extension<AppCustomColors>()!.scorecardBorder,
          width: 1,
        )),
        boxShadow: AppShadows.cardShadow(isDark),
      ),
      child: child,
    );

    if (onTap != null) {
      return InkWell(
        onTap: onTap,
        borderRadius: borderRadius ?? BorderRadius.circular(AppRadius.xl),
        child: card,
      );
    }

    return card;
  }
}