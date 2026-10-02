import 'package:flutter/material.dart';
import 'app_colors.dart';
import 'app_text_styles.dart';
import 'app_spacing.dart';

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
      outlineVariant: AppColors.border(isDark).withAlpha((0.5 * 255).round()),
      shadow: Colors.black.withAlpha((isDark ? 0.3 : 0.1 * 255).round()),
      scrim: Colors.black.withAlpha((0.5 * 255).round()),
      inverseSurface: isDark ? AppColors.surfaceLight : AppColors.surfaceDark,
      onInverseSurface: isDark ? AppColors.onSurface(false) : AppColors.onSurface(true),
      inversePrimary: isDark ? AppColors.primaryLight : AppColors.primaryDark,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AppColors.background(isDark),
      canvasColor: AppColors.surface(isDark),

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

      appBarTheme: AppBarTheme(
        centerTitle: false,
        elevation: 0,
        scrolledUnderElevation: 1,
        backgroundColor: AppColors.surface(isDark).withAlpha((0.8 * 255).round()),
        surfaceTintColor: Colors.transparent,
        foregroundColor: AppColors.onSurface(isDark),
        titleTextStyle: AppTextStyles.titleLarge(isDark),
        toolbarTextStyle: AppTextStyles.bodyMedium(isDark),
        iconTheme: IconThemeData(color: AppColors.onSurface(isDark)),
        actionsIconTheme: IconThemeData(color: AppColors.onSurface(isDark)),
      ),

      cardTheme: CardTheme(
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.xl),
          side: BorderSide(color: AppColors.cardBorder(isDark), width: 1),
        ),
        color: AppColors.surface(isDark),
        shadowColor: AppColors.shadow(isDark),
      ),

      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          elevation: 0,
          backgroundColor: AppColors.primary(isDark),
          foregroundColor: Colors.white,
          disabledBackgroundColor: AppColors.primary(isDark).withAlpha((0.5 * 255).round()),
          disabledForegroundColor: Colors.white.withAlpha((0.7 * 255).round()),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.lg),
          ),
          textStyle: AppTextStyles.labelLarge(isDark),
          minimumSize: const Size(88, 48),
        ),
      ),

      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.primary(isDark),
          side: BorderSide(color: AppColors.primary(isDark), width: 1.5),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.lg),
          ),
          textStyle: AppTextStyles.labelLarge(isDark),
          minimumSize: const Size(88, 48),
        ),
      ),

      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.primary(isDark),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.md),
          ),
          textStyle: AppTextStyles.labelMedium(isDark),
        ),
      ),

      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.background(isDark).withAlpha((0.5 * 255).round()),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.lg),
          borderSide: BorderSide(color: AppColors.border(isDark), width: 1),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.lg),
          borderSide: BorderSide(color: AppColors.border(isDark), width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.lg),
          borderSide: BorderSide(color: AppColors.primary(isDark), width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.lg),
          borderSide: BorderSide(color: AppColors.error(isDark), width: 1),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.lg),
          borderSide: BorderSide(color: AppColors.error(isDark), width: 2),
        ),
        disabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.lg),
          borderSide: BorderSide(color: AppColors.border(isDark).withAlpha((0.5 * 255).round()), width: 1),
        ),
        labelStyle: AppTextStyles.bodyMedium(isDark).copyWith(color: AppColors.onSurfaceVariant(isDark)),
        hintStyle: AppTextStyles.bodyMedium(isDark).copyWith(color: AppColors.onSurfaceVariant(isDark).withAlpha((0.6 * 255).round())),
        floatingLabelStyle: AppTextStyles.labelMedium(isDark).copyWith(color: AppColors.primary(isDark)),
        errorStyle: AppTextStyles.bodySmall(isDark).copyWith(color: AppColors.error(isDark)),
        prefixIconColor: AppColors.onSurfaceVariant(isDark),
        suffixIconColor: AppColors.onSurfaceVariant(isDark),
      ),

      chipTheme: ChipThemeData(
        backgroundColor: AppColors.surface(isDark),
        disabledColor: AppColors.surface(isDark).withAlpha((0.5 * 255).round()),
        selectedColor: AppColors.primary(isDark).withAlpha((0.15 * 255).round()),
        secondarySelectedColor: AppColors.primary(isDark).withAlpha((0.15 * 255).round()),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        labelStyle: AppTextStyles.labelMedium(isDark),
        secondaryLabelStyle: AppTextStyles.labelMedium(isDark).copyWith(color: Colors.white),
        brightness: brightness,
        elevation: 0,
        pressElevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          side: BorderSide(color: AppColors.border(isDark), width: 1),
        ),
        showCheckmark: false,
      ),

      dividerTheme: DividerThemeData(
        color: AppColors.border(isDark),
        thickness: 1,
        space: 1,
      ),

      listTileTheme: ListTileThemeData(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        titleTextStyle: AppTextStyles.titleMedium(isDark),
        subtitleTextStyle: AppTextStyles.bodyMedium(isDark),
        leadingAndTrailingTextStyle: AppTextStyles.bodyMedium(isDark),
        iconColor: AppColors.onSurfaceVariant(isDark),
        textColor: AppColors.onSurface(isDark),
        selectedColor: AppColors.primary(isDark).withAlpha((0.1 * 255).round()),
        selectedTileColor: AppColors.primary(isDark).withAlpha((0.1 * 255).round()),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
      ),

      dialogTheme: DialogTheme(
        backgroundColor: AppColors.surface(isDark),
        surfaceTintColor: Colors.transparent,
        elevation: 24,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.xl)),
        titleTextStyle: AppTextStyles.headlineSmall(isDark),
        contentTextStyle: AppTextStyles.bodyMedium(isDark),
      ),

      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: AppColors.surface(isDark),
        surfaceTintColor: Colors.transparent,
        elevation: 16,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
        ),
        modalBackgroundColor: AppColors.surface(isDark),
        dragHandleColor: AppColors.onSurfaceVariant(isDark).withAlpha((0.5 * 255).round()),
        showDragHandle: true,
      ),

      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: AppColors.surface(isDark).withAlpha((0.9 * 255).round()),
        surfaceTintColor: Colors.transparent,
        elevation: 8,
        indicatorColor: AppColors.primary(isDark).withAlpha((0.15 * 255).round()),
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

      tabBarTheme: TabBarTheme(
        labelColor: AppColors.primary(isDark),
        unselectedLabelColor: AppColors.onSurfaceVariant(isDark),
        indicatorColor: AppColors.primary(isDark),
        indicatorSize: TabBarIndicatorSize.label,
        labelStyle: AppTextStyles.labelLarge(isDark),
        unselectedLabelStyle: AppTextStyles.labelLarge(isDark),
        dividerColor: Colors.transparent,
        overlayColor: WidgetStateProperty.all(AppColors.primary(isDark).withAlpha((0.1 * 255).round())),
      ),

      progressIndicatorTheme: ProgressIndicatorThemeData(
        color: AppColors.primary(isDark),
        linearTrackColor: AppColors.primary(isDark).withAlpha((0.2 * 255).round()),
        circularTrackColor: AppColors.primary(isDark).withAlpha((0.2 * 255).round()),
      ),

      sliderTheme: SliderThemeData(
        activeTrackColor: AppColors.primary(isDark),
        inactiveTrackColor: AppColors.primary(isDark).withAlpha((0.2 * 255).round()),
        thumbColor: AppColors.primary(isDark),
        overlayColor: AppColors.primary(isDark).withAlpha((0.15 * 255).round()),
        valueIndicatorColor: AppColors.primary(isDark),
        valueIndicatorTextStyle: AppTextStyles.labelSmall(isDark).copyWith(color: Colors.white),
      ),

      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected) 
              ? AppColors.primary(isDark) 
              : AppColors.onSurfaceVariant(isDark).withAlpha((0.5 * 255).round()),
        ),
        trackColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected) 
              ? AppColors.primary(isDark).withAlpha((0.5 * 255).round())
              : AppColors.onSurfaceVariant(isDark).withAlpha((0.3 * 255).round()),
        ),
        trackOutlineColor: WidgetStateProperty.all(Colors.transparent),
      ),

      checkboxTheme: CheckboxThemeData(
        fillColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected) 
              ? AppColors.primary(isDark) 
              : Colors.transparent,
        ),
        checkColor: WidgetStateProperty.all(Colors.white),
        side: BorderSide(color: AppColors.border(isDark), width: 2),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
      ),

      radioTheme: RadioThemeData(
        fillColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected) 
              ? AppColors.primary(isDark) 
              : AppColors.onSurfaceVariant(isDark),
        ),
      ),

      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: AppColors.primary(isDark),
        foregroundColor: Colors.white,
        elevation: 8,
        focusElevation: 12,
        hoverElevation: 12,
        highlightElevation: 16,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.lg)),
        extendedTextStyle: AppTextStyles.labelLarge(isDark),
      ),

      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.surfaceDark,
        contentTextStyle: AppTextStyles.bodyMedium(true),
        actionTextColor: AppColors.accent(true),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.lg)),
        behavior: SnackBarBehavior.floating,
        elevation: 8,
      ),

      tooltipTheme: TooltipThemeData(
        decoration: BoxDecoration(
          color: AppColors.surfaceDark,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(color: AppColors.border(true)),
        ),
        textStyle: AppTextStyles.bodySmall(true),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        preferBelow: true,
      ),

      extensions: <ThemeExtension<dynamic>>[
        AppCustomColors(isDark),
      ],
    );
  }
}

class AppCustomColors extends ThemeExtension<AppCustomColors> {
  final bool isDark;
  AppCustomColors(this.isDark);

  Color get pitchLineColor => AppColors.primary(isDark).withAlpha((0.05 * 255).round());
  Color get floodlightGlowColor => AppColors.primary(isDark).withAlpha((0.1 * 255).round());
  Color get glassNavBg => AppColors.background(isDark).withAlpha((0.8 * 255).round());
  Color get scorecardBorder => AppColors.cardBorder(isDark);
  Color get scorecardHoverBorder => AppColors.primary(isDark);
  Color get scorecardHoverBg => AppColors.primary(isDark).withAlpha((0.05 * 255).round());

  @override
  AppCustomColors copyWith({bool? isDark}) => AppCustomColors(isDark ?? this.isDark);

  @override
  AppCustomColors lerp(ThemeExtension<AppCustomColors>? other, double t) {
    if (other is! AppCustomColors) return this;
    return AppCustomColors(other.isDark);
  }
}

extension CustomColors on ThemeData {
  AppCustomColors get customColors => extension<AppCustomColors>()!;
}