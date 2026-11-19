import 'package:material_ui/material_ui.dart';

/// Design tokens (docs/04 §5, adjusted by the ui-ux-pro-max + unslop pass):
/// warm neutral surfaces, one field-green accent, peril colours only inside the rain meter.
class Tokens {
  static const accent = Color(0xFF15803D); // field green, 5.0:1 on white
  static const accentDark = Color(0xFF4ADE80);
  static const drought = Color(0xFFB45309); // ochre, 5.0:1 on white
  static const flood = Color(0xFF1D4ED8); // river blue, 6.7:1 on white
  static const danger = Color(0xFFB91C1C);

  // Warm stone ramp ("soil") for surfaces and text.
  static const bg = Color(0xFFF7F6F3);
  static const surface = Color(0xFFFFFFFF);
  static const hairline = Color(0xFFE7E5E4);
  static const text = Color(0xFF1C1917); // primary
  static const textSecondary = Color(0xFF57534E); // 7.6:1
  static const textMuted = Color(0xFF6B6560); // 5.6:1

  static const bgDark = Color(0xFF151413);
  static const surfaceDark = Color(0xFF1F1D1B);
  static const hairlineDark = Color(0xFF34312E);
  static const textDark = Color(0xFFF5F5F4);
  static const textSecondaryDark = Color(0xFFC8C3BE);

  // 4px grid.
  static const s1 = 4.0,
      s2 = 8.0,
      s3 = 12.0,
      s4 = 16.0,
      s5 = 20.0,
      s6 = 24.0,
      s8 = 32.0;
  static const radiusControl = 12.0, radiusCard = 16.0;
  static const touchPrimary = 56.0; // farmers: big targets (NFR-14)
}

ThemeData buildTheme(Brightness brightness) {
  final dark = brightness == Brightness.dark;
  final scheme = ColorScheme(
    brightness: brightness,
    primary: dark ? Tokens.accentDark : Tokens.accent,
    onPrimary: dark ? Tokens.bgDark : Colors.white,
    secondary: Tokens.drought,
    onSecondary: Colors.white,
    error: Tokens.danger,
    onError: Colors.white,
    surface: dark ? Tokens.surfaceDark : Tokens.surface,
    onSurface: dark ? Tokens.textDark : Tokens.text,
    onSurfaceVariant: dark ? Tokens.textSecondaryDark : Tokens.textSecondary,
    outline: dark ? Tokens.hairlineDark : Tokens.hairline,
    outlineVariant: dark ? Tokens.hairlineDark : Tokens.hairline,
    surfaceContainerHighest: dark
        ? const Color(0xFF2A2725)
        : const Color(0xFFF0EEEA),
  );

  // Body 18 for low-literacy readers; weights 400/500/600 only (unslop type pass).
  final base = Typography.material2021(platform: TargetPlatform.android).black
      .apply(bodyColor: scheme.onSurface, displayColor: scheme.onSurface);
  final text = base.copyWith(
    headlineMedium: base.headlineMedium?.copyWith(
      fontSize: 28,
      fontWeight: FontWeight.w600,
      height: 1.25,
    ),
    titleLarge: base.titleLarge?.copyWith(
      fontSize: 22,
      fontWeight: FontWeight.w600,
      height: 1.3,
    ),
    titleMedium: base.titleMedium?.copyWith(
      fontSize: 18,
      fontWeight: FontWeight.w500,
      height: 1.35,
    ),
    bodyLarge: base.bodyLarge?.copyWith(fontSize: 18, height: 1.5),
    bodyMedium: base.bodyMedium?.copyWith(
      fontSize: 16,
      height: 1.5,
      color: scheme.onSurfaceVariant,
    ),
    labelLarge: base.labelLarge?.copyWith(
      fontSize: 18,
      fontWeight: FontWeight.w500,
    ),
    labelMedium: base.labelMedium?.copyWith(
      fontSize: 14,
      fontWeight: FontWeight.w500,
      color: scheme.onSurfaceVariant,
    ),
  );

  final controlShape = RoundedRectangleBorder(
    borderRadius: BorderRadius.circular(Tokens.radiusControl),
  );
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: dark ? Tokens.bgDark : Tokens.bg,
    textTheme: text,
    appBarTheme: AppBarTheme(
      backgroundColor: dark ? Tokens.bgDark : Tokens.bg,
      foregroundColor: scheme.onSurface,
      elevation: 0,
      scrolledUnderElevation: 0,
      titleTextStyle: text.titleLarge,
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(Tokens.touchPrimary),
        shape: controlShape,
        textStyle: text.labelLarge,
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size.fromHeight(Tokens.touchPrimary),
        shape: controlShape,
        side: BorderSide(color: scheme.outline),
        textStyle: text.labelLarge,
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        minimumSize: const Size(48, 48),
        textStyle: text.labelLarge,
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: scheme.surface,
      contentPadding: const EdgeInsets.symmetric(
        horizontal: Tokens.s4,
        vertical: Tokens.s4,
      ),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(Tokens.radiusControl),
        borderSide: BorderSide(color: scheme.outline),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(Tokens.radiusControl),
        borderSide: BorderSide(color: scheme.outline),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(Tokens.radiusControl),
        borderSide: BorderSide(color: scheme.primary, width: 2),
      ),
      labelStyle: text.bodyLarge?.copyWith(color: scheme.onSurfaceVariant),
    ),
    cardTheme: CardThemeData(
      color: scheme.surface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(Tokens.radiusCard),
        side: BorderSide(color: scheme.outline),
      ),
    ),
    chipTheme: ChipThemeData(
      shape: controlShape,
      labelStyle: text.labelLarge,
      side: BorderSide(color: scheme.outline),
    ),
    dividerTheme: DividerThemeData(color: scheme.outline, space: 1),
    pageTransitionsTheme: const PageTransitionsTheme(
      builders: {TargetPlatform.android: FadeForwardsPageTransitionsBuilder()},
    ),
  );
}
