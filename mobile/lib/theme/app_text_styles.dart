import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

class AppTextStyles {
  static TextStyle displayLarge(bool isDark) => GoogleFonts.syne(
        fontSize: 57,
        fontWeight: FontWeight.w800,
        color: AppColors.onSurface(isDark),
        letterSpacing: -1.5,
        height: 1.12,
      );

  static TextStyle displayMedium(bool isDark) => GoogleFonts.syne(
        fontSize: 45,
        fontWeight: FontWeight.w700,
        color: AppColors.onSurface(isDark),
        letterSpacing: -0.5,
        height: 1.16,
      );

  static TextStyle displaySmall(bool isDark) => GoogleFonts.syne(
        fontSize: 36,
        fontWeight: FontWeight.w700,
        color: AppColors.onSurface(isDark),
        letterSpacing: 0,
        height: 1.22,
      );

  static TextStyle headlineLarge(bool isDark) => GoogleFonts.syne(
        fontSize: 32,
        fontWeight: FontWeight.w700,
        color: AppColors.onSurface(isDark),
        letterSpacing: 0,
        height: 1.25,
      );

  static TextStyle headlineMedium(bool isDark) => GoogleFonts.syne(
        fontSize: 28,
        fontWeight: FontWeight.w700,
        color: AppColors.onSurface(isDark),
        letterSpacing: 0,
        height: 1.29,
      );

  static TextStyle headlineSmall(bool isDark) => GoogleFonts.syne(
        fontSize: 24,
        fontWeight: FontWeight.w700,
        color: AppColors.onSurface(isDark),
        letterSpacing: 0,
        height: 1.33,
      );

  static TextStyle titleLarge(bool isDark) => GoogleFonts.outfit(
        fontSize: 22,
        fontWeight: FontWeight.w600,
        color: AppColors.onSurface(isDark),
        letterSpacing: 0,
        height: 1.27,
      );

  static TextStyle titleMedium(bool isDark) => GoogleFonts.outfit(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: AppColors.onSurface(isDark),
        letterSpacing: 0.15,
        height: 1.5,
      );

  static TextStyle titleSmall(bool isDark) => GoogleFonts.outfit(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: AppColors.onSurface(isDark),
        letterSpacing: 0.1,
        height: 1.43,
      );

  static TextStyle bodyLarge(bool isDark) => GoogleFonts.outfit(
        fontSize: 16,
        fontWeight: FontWeight.w400,
        color: AppColors.onSurface(isDark),
        letterSpacing: 0.5,
        height: 1.5,
      );

  static TextStyle bodyMedium(bool isDark) => GoogleFonts.outfit(
        fontSize: 14,
        fontWeight: FontWeight.w400,
        color: AppColors.onSurface(isDark),
        letterSpacing: 0.25,
        height: 1.43,
      );

  static TextStyle bodySmall(bool isDark) => GoogleFonts.outfit(
        fontSize: 12,
        fontWeight: FontWeight.w400,
        color: AppColors.onSurfaceVariant(isDark),
        letterSpacing: 0.4,
        height: 1.33,
      );

  static TextStyle labelLarge(bool isDark) => GoogleFonts.outfit(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: AppColors.onSurface(isDark),
        letterSpacing: 0.1,
        height: 1.43,
      );

  static TextStyle labelMedium(bool isDark) => GoogleFonts.outfit(
        fontSize: 12,
        fontWeight: FontWeight.w600,
        color: AppColors.onSurface(isDark),
        letterSpacing: 0.5,
        height: 1.33,
      );

  static TextStyle labelSmall(bool isDark) => GoogleFonts.outfit(
        fontSize: 11,
        fontWeight: FontWeight.w600,
        color: AppColors.onSurfaceVariant(isDark),
        letterSpacing: 0.5,
        height: 1.45,
      );

  static TextStyle monoLarge(bool isDark) => GoogleFonts.jetBrainsMono(
        fontSize: 16,
        fontWeight: FontWeight.w500,
        color: AppColors.onSurface(isDark),
        letterSpacing: 0,
        height: 1.5,
      );

  static TextStyle monoMedium(bool isDark) => GoogleFonts.jetBrainsMono(
        fontSize: 14,
        fontWeight: FontWeight.w500,
        color: AppColors.onSurface(isDark),
        letterSpacing: 0,
        height: 1.43,
      );

  static TextStyle monoSmall(bool isDark) => GoogleFonts.jetBrainsMono(
        fontSize: 12,
        fontWeight: FontWeight.w400,
        color: AppColors.onSurfaceVariant(isDark),
        letterSpacing: 0,
        height: 1.33,
      );

  static TextStyle monoXSmall(bool isDark) => GoogleFonts.jetBrainsMono(
        fontSize: 10,
        fontWeight: FontWeight.w500,
        color: AppColors.onSurfaceVariant(isDark),
        letterSpacing: 0,
        height: 1.4,
      );
}