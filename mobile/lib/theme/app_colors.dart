import 'package:flutter/material.dart';

class AppColors {
  static const Color primaryLight = Color(0xFF10B981);
  static const Color primaryDark = Color(0xFF34D399);
  static const Color accentLight = Color(0xFFFACC15);
  static const Color accentDark = Color(0xFFFBBF24);

  static const Color bgLight = Color(0xFFF8FAFC);
  static const Color bgDark = Color(0xFF000000);
  static const Color surfaceLight = Color(0xFFFFFFFF);
  static const Color surfaceDark = Color(0xFF0A0A0A);
  static const Color textLight = Color(0xFF0F172A);
  static const Color textDark = Color(0xFFF1F5F9);
  static const Color textMutedLight = Color(0xFF64748B);
  static const Color textMutedDark = Color(0xFF94A3B8);
  static const Color borderLight = Color(0xFFE2E8F0);
  static const Color borderDark = Color(0xFF1E293B);
  static const Color cardBorderLight = Color(0x1A10B981);
  static const Color cardBorderDark = Color(0x1A10B981);

  static const Color successLight = Color(0xFF10B981);
  static const Color successDark = Color(0xFF34D399);
  static const Color errorLight = Color(0xFFEF4444);
  static const Color errorDark = Color(0xFFF87171);
  static const Color warningLight = Color(0xFFF59E0B);
  static const Color warningDark = Color(0xFFFBBF24);
  static const Color infoLight = Color(0xFF3B82F6);
  static const Color infoDark = Color(0xFF60A5FA);

  static const Color broadcastBgLight = Color(0xFFFFF8E1);
  static const Color broadcastBgDark = Color(0xFF451A03);
  static const Color adminBgLight = Color(0xFFE7F3FF);
  static const Color adminBgDark = Color(0xFF0D1B2A);

  static Color primary(bool isDark) => isDark ? primaryDark : primaryLight;
  static Color accent(bool isDark) => isDark ? accentDark : accentLight;
  static Color background(bool isDark) => isDark ? bgDark : bgLight;
  static Color surface(bool isDark) => isDark ? surfaceDark : surfaceLight;
  static Color onSurface(bool isDark) => isDark ? textDark : textLight;
  static Color onSurfaceVariant(bool isDark) => isDark ? textMutedDark : textMutedLight;
  static Color border(bool isDark) => isDark ? borderDark : borderLight;
  static Color cardBorder(bool isDark) => isDark ? cardBorderDark : cardBorderLight;
  static Color success(bool isDark) => isDark ? successDark : successLight;
  static Color error(bool isDark) => isDark ? errorDark : errorLight;
  static Color warning(bool isDark) => isDark ? warningDark : warningLight;
  static Color info(bool isDark) => isDark ? infoDark : infoLight;

  static Color shadow(bool isDark) => Colors.black.withValues(opacity: isDark ? 0.3 : 0.1);
}