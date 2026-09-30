import 'package:flutter/material.dart';
import 'app_colors.dart';

class AppSpacing {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 16;
  static const double lg = 24;
  static const double xl = 32;
  static const double xxl = 48;
  static const double xxxl = 64;
}

class AppRadius {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 20;
  static const double xxl = 24;
  static const double round = 999;
}

class AppShadows {
  static List<BoxShadow> cardShadow(bool isDark) => [
        BoxShadow(
          color: Colors.black.withOpacity(isDark ? 0.2 : 0.06),
          offset: const Offset(0, 2),
          blurRadius: 8,
          spreadRadius: 0,
        ),
        BoxShadow(
          color: Colors.black.withOpacity(isDark ? 0.1 : 0.04),
          offset: const Offset(0, 1),
          blurRadius: 3,
          spreadRadius: -1,
        ),
      ];

  static List<BoxShadow> cardHoverShadow(bool isDark) => [
        BoxShadow(
          color: Colors.black.withOpacity(isDark ? 0.3 : 0.1),
          offset: const Offset(0, 8),
          blurRadius: 25,
          spreadRadius: -5,
        ),
      ];

  static List<BoxShadow> glowShadow(bool isDark, {Color? color}) => [
        BoxShadow(
          color: (color ?? (isDark ? Colors.white : Colors.black)).withOpacity(0.15),
          offset: Offset.zero,
          blurRadius: 30,
          spreadRadius: -10,
        ),
      ];
}

class AppDurations {
  static const Duration fast = Duration(milliseconds: 150);
  static const Duration normal = Duration(milliseconds: 300);
  static const Duration slow = Duration(milliseconds: 500);
  static const Duration verySlow = Duration(milliseconds: 800);
}

class AppCurves {
  static const Curve standard = Curves.easeInOutCubic;
  static const Curve emphasize = Curves.easeOutCubic;
  static const Curve decelerate = Curves.easeOutQuart;
  static const Curve accelerate = Curves.easeInQuart;
}