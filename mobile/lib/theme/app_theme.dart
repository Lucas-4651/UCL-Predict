import 'package:flutter/material.dart';
import 'app_colors.dart';
import 'app_text_styles.dart';

class AppTheme {
  static ThemeData lightTheme = _buildTheme(Brightness.light);
  static ThemeData darkTheme = _buildTheme(Brightness.dark);

  static ThemeData _buildTheme(Brightness brightness) {
    final bool isDark = brightness == Brightness.dark;
    final ColorScheme colorScheme = ColorScheme(
      brightness: brightness,
      primary: AppColors.primary(isDark),
      onPrimary: Colors.white,
      secondary: AppColors.accent(isDark),
      onSecondary: isDark ? Colors.black : Colors.white,
      tertiary: AppColors.info(isDark),
      onTertiary: Colors.white,
      error: AppColors.error(isDark),
      onError: Colors.white,
      surface: AppColors.surface(isDark),
      onSurface: AppColors.onSurface(isDark),
      onSurfaceVariant: AppColors.onSurfaceVariant(isDark),
      outline: AppColors.border(isDark),
      outlineVariant: AppColors.border(isDark).withOpacity(0.5),
      shadow: Colors.black.withOpacity(isDark ? 0.3 : 0.1),
      scrim: Colors.black.withOpacity(0.5),
      inverseSurface: isDark ? AppColors.surfaceLight : AppColors.surfaceDark,
      onInverseSurface: isDark ? AppColors.onSurfaceLight : AppColors.onSurfaceDark,
      inversePrimary: isDark ? AppColors.primaryLight : AppColors.primaryDark,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AppColors.background(isDark),
      canvasColor: AppColors.surface(isDark),

      // Typography
      textTheme: TextTheme(
        displayLarge: AppTextStyles.displayLarge(isDark),
        displayMedium: AppTextStyles.displayMedium(isDark),
        displaySmall: AppTextStyles.displaySmall(isDark),
        headlineLarge: AppTextStyles.headlineLarge(isDark),
        headlineMedium: AppTextStyles.headlineMedium(isDark),
        headlineSmall: AppTextStyles.headlineSmall(isDark),
        titleLarge: AppTextStyles.titleLarge(isDark),
        titleMedium: AppTextStyles.titleMedium(isDark),
        titleSmall: AppTextStyles.titleSmall(isDark),
        bodyLarge: AppTextStyles.bodyLarge(isDark),
        bodyMedium: AppTextStyles.bodyMedium(isDark),
        bodySmall: AppTextStyles.bodySmall(isDark),
        labelLarge: AppTextStyles.labelLarge(isDark),
        labelMedium: AppTextStyles.labelMedium(isDark),
        labelSmall: AppTextStyles.labelSmall(isDark),
      ),

      // AppBar
      appBarTheme: AppBarTheme(
        centerTitle: false,
        elevation: 0,
        scrolledUnderElevation: 1,
        backgroundColor: AppColors.surface(isDark).withOpacity(0.8),
        surfaceTintColor: Colors.transparent,
        foregroundColor: AppColors.onSurface(isDark),
        titleTextStyle: AppTextStyles.titleLarge(isDark),
        toolbarTextStyle: AppTextStyles.bodyMedium(isDark),
        iconTheme: IconThemeData(color: AppColors.onSurface(isDark)),
        actionsIconTheme: IconThemeData(color: AppColors.onSurface(isDark)),
      ),

      // Card
      cardTheme: CardThemeData(
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(color: AppColors.cardBorder(isDark), width: 1),
        ),
        color: AppColors.surface(isDark),
        shadowColor: AppColors.shadow(isDark),
      ),

      // ElevatedButton
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          elevation: 0,
          backgroundColor: AppColors.primary(isDark),
          foregroundColor: Colors.white,
          disabledBackgroundColor: AppColors.primary(isDark).withOpacity(0.5),
          disabledForegroundColor: Colors.white.withOpacity(0.7),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          textStyle: AppTextStyles.labelLarge(isDark),
          minimumSize: const Size(88, 48),
        ),
      ),

      // OutlinedButton
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.primary(isDark),
          side: BorderSide(color: AppColors.primary(isDark), width: 1.5),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          textStyle: AppTextStyles.labelLarge(isDark),
          minimumSize: const Size(88, 48),
        ),
      ),

      // TextButton
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.primary(isDark),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: AppTextStyles.labelMedium(isDark),
        ),
      ),

      // InputDecoration
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.background(isDark).withOpacity(0.5),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: AppColors.border(isDark), width: 1),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: AppColors.border(isDark), width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: AppColors.primary(isDark), width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: AppColors.error(isDark), width: 1),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: AppColors.error(isDark), width: 2),
        ),
        disabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: AppColors.border(isDark).withOpacity(0.5), width: 1),
        ),
        labelStyle: AppTextStyles.bodyMedium(isDark).copyWith(color: AppColors.onSurfaceVariant(isDark)),
        hintStyle: AppTextStyles.bodyMedium(isDark).copyWith(color: AppColors.onSurfaceVariant(isDark).withOpacity(0.6)),
        floatingLabelStyle: AppTextStyles.labelMedium(isDark).copyWith(color: AppColors.primary(isDark)),
        errorStyle: AppTextStyles.bodySmall(isDark).copyWith(color: AppColors.error(isDark)),
        prefixIconColor: AppColors.onSurfaceVariant(isDark),
        suffixIconColor: AppColors.onSurfaceVariant(isDark),
      ),

      // Chip
      chipTheme: ChipThemeData(
        backgroundColor: AppColors.surface(isDark),
        disabledColor: AppColors.surface(isDark).withOpacity(0.5),
        selectedColor: AppColors.primary(isDark).withOpacity(0.15),
        secondarySelectedColor: AppColors.primary(isDark).withOpacity(0.15),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        labelStyle: AppTextStyles.labelMedium(isDark),
        secondaryLabelStyle: AppTextStyles.labelMedium(isDark).copyWith(color: Colors.white),
        brightness: brightness,
        elevation: 0,
        pressElevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: AppColors.border(isDark), width: 1),
        ),
        showCheckmark: false,
      ),

      // Divider
      dividerTheme: DividerThemeData(
        color: AppColors.border(isDark),
        thickness: 1,
        space: 1,
      ),

      // ListTile
      listTileTheme: ListTileThemeData(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        titleTextStyle: AppTextStyles.titleMedium(isDark),
        subtitleTextStyle: AppTextStyles.bodyMedium(isDark),
        leadingAndTrailingTextStyle: AppTextStyles.bodyMedium(isDark),
        iconColor: AppColors.onSurfaceVariant(isDark),
        textColor: AppColors.onSurface(isDark),
        selectedColor: AppColors.primary(isDark).withOpacity(0.1),
        selectedTileColor: AppColors.primary(isDark).withOpacity(0.1),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),

      // Dialog
      dialogTheme: DialogThemeData(
        backgroundColor: AppColors.surface(isDark),
        surfaceTintColor: Colors.transparent,
        elevation: 24,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        titleTextStyle: AppTextStyles.headlineSmall(isDark),
        contentTextStyle: AppTextStyles.bodyMedium(isDark),
      ),

      // BottomSheet
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: AppColors.surface(isDark),
        surfaceTintColor: Colors.transparent,
        elevation: 16,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        modalBackgroundColor: AppColors.surface(isDark),
        dragHandleColor: AppColors.onSurfaceVariant(isDark).withOpacity(0.5),
        showDragHandle: true,
      ),

      // NavigationBar
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: AppColors.surface(isDark).withOpacity(0.9),
        surfaceTintColor: Colors.transparent,
        elevation: 8,
        indicatorColor: AppColors.primary(isDark).withOpacity(0.15),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return AppTextStyles.labelSmall(isDark).copyWith(color: AppColors.primary(isDark));
          }
          return AppTextStyles.labelSmall(isDark).copyWith(color: AppColors.onSurfaceVariant(isDark));
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return IconThemeData(color: AppColors.primary(isDark), size: 24);
          }
          return IconThemeData(color: AppColors.onSurfaceVariant(isDark), size: 24);
        }),
      ),

      // TabBar
      tabBarTheme: TabBarThemeData(
        labelColor: AppColors.primary(isDark),
        unselectedLabelColor: AppColors.onSurfaceVariant(isDark),
        indicatorColor: AppColors.primary(isDark),
        indicatorSize: TabBarIndicatorSize.label,
        labelStyle: AppTextStyles.labelLarge(isDark),
        unselectedLabelStyle: AppTextStyles.labelLarge(isDark),
        dividerColor: Colors.transparent,
        overlayColor: WidgetStateProperty.all(AppColors.primary(isDark).withOpacity(0.1)),
      ),

      // ProgressIndicator
      progressIndicatorTheme: ProgressIndicatorThemeData(
        color: AppColors.primary(isDark),
        linearTrackColor: AppColors.primary(isDark).withOpacity(0.2),
        circularTrackColor: AppColors.primary(isDark).withOpacity(0.2),
      ),

      // Slider
      sliderTheme: SliderThemeData(
        activeTrackColor: AppColors.primary(isDark),
        inactiveTrackColor: AppColors.primary(isDark).withOpacity(0.2),
        thumbColor: AppColors.primary(isDark),
        overlayColor: AppColors.primary(isDark).withOpacity(0.15),
        valueIndicatorColor: AppColors.primary(isDark),
        valueIndicatorTextStyle: AppTextStyles.labelSmall(isDark).copyWith(color: Colors.white),
      ),

      // Switch
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return AppColors.primary(isDark);
          return AppColors.onSurfaceVariant(isDark).withOpacity(0.5);
        }),
        trackColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return AppColors.primary(isDark).withOpacity(0.5);
          return AppColors.onSurfaceVariant(isDark).withOpacity(0.3);
        }),
        trackOutlineColor: WidgetStateProperty.all(Colors.transparent),
      ),

      // Checkbox
      checkboxTheme: CheckboxThemeData(
        fillColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return AppColors.primary(isDark);
          return Colors.transparent;
        }),
        checkColor: WidgetStateProperty.all(Colors.white),
        side: BorderSide(color: AppColors.border(isDark), width: 2),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
      ),

      // Radio
      radioTheme: RadioThemeData(
        fillColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return AppColors.primary(isDark);
          return AppColors.onSurfaceVariant(isDark);
        }),
      ),

      // FloatingActionButton
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: AppColors.primary(isDark),
        foregroundColor: Colors.white,
        elevation: 8,
        focusElevation: 12,
        hoverElevation: 12,
        highlightElevation: 16,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        extendedTextStyle: AppTextStyles.labelLarge(isDark),
      ),

      // SnackBar
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.surfaceDark,
        contentTextStyle: AppTextStyles.bodyMedium(true),
        actionTextColor: AppColors.accent(true),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        behavior: SnackBarBehavior.floating,
        elevation: 8,
      ),

      // Tooltip
      tooltipTheme: TooltipThemeData(
        decoration: BoxDecoration(
          color: AppColors.surfaceDark,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border(true)),
        ),
        textStyle: AppTextStyles.bodySmall(true),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        preferBelow: true,
      ),

      // Extensions for custom colors
      extensions: <ThemeExtension<dynamic>>[
        _AppCustomColors(isDark),
      ],
    );
  }
}

class _AppCustomColors extends ThemeExtension<_AppCustomColors> {
  final bool isDark;
  _AppCustomColors(this.isDark);

  Color get pitchLineColor => AppColors.primary(isDark).withOpacity(0.05);
  Color get floodlightGlowColor => AppColors.primary(isDark).withOpacity(0.1);
  Color get glassNavBg => AppColors.background(isDark).withOpacity(0.8);
  Color get scorecardBorder => AppColors.cardBorder(isDark);
  Color get scorecardHoverBorder => AppColors.primary(isDark);
  Color get scorecardHoverBg => AppColors.primary(isDark).withOpacity(0.05);

  @override
  _AppCustomColors copyWith({bool? isDark}) => _AppCustomColors(isDark ?? this.isDark);

  @override
  _AppCustomColors lerp(ThemeExtension<_AppCustomColors>? other, double t) {
    if (other is! _AppCustomColors) return this;
    return _AppCustomColors(other.isDark);
  }
}

extension CustomColors on ThemeData {
  _AppCustomColors get customColors => extension<_AppCustomColors>()!;
}