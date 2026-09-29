import 'package:flutter/material.dart';

import 'app_colors.dart';

/// Text styles from the Figma type scale (Google Sans Flex, tracking -2%).
/// The font is variable, so weight is driven through the `wght` axis.
abstract final class AppText {
  static TextStyle _sans(double size, int weight, double lineHeight) =>
      TextStyle(
        fontFamily: 'GoogleSansFlex',
        fontSize: size,
        height: lineHeight / size,
        letterSpacing: size * -0.02,
        fontWeight: FontWeight.values[(weight ~/ 100) - 1],
        fontVariations: [FontVariation('wght', weight.toDouble())],
        color: AppColors.ink,
      );

  static final displaySm = _sans(30, 600, 38);
  static final displaySmMedium = _sans(30, 500, 38);
  static final displayMd = _sans(36, 600, 44);
  static final displayXs = _sans(24, 500, 32);
  static final textLgSemibold = _sans(18, 600, 28);
  static final textLgMedium = _sans(18, 500, 28);
  static final textMdMedium = _sans(16, 500, 24);
  static final textMdSemibold = _sans(16, 600, 24);
  static final textSmRegular = _sans(14, 400, 20);
  static final textSmMedium = _sans(14, 500, 20);
  static final textSmBold = _sans(14, 700, 20);
  static final textSmSemibold = _sans(14, 600, 20);
  static final textXsRegular = _sans(12, 400, 18);
  static final textXsMedium = _sans(12, 500, 18);

  /// Figma's "font/family/title" (Outfit Medium) — back links, day headings.
  static TextStyle outfit(double size, Color color, {double? lineHeight}) =>
      TextStyle(
        fontFamily: 'Outfit',
        fontSize: size,
        height: lineHeight == null ? null : lineHeight / size,
        fontWeight: FontWeight.w500,
        fontVariations: const [FontVariation('wght', 500)],
        color: color,
      );

  /// Status labels use Inter Medium (Figma "Label" component, size L).
  static const label = TextStyle(
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: FontWeight.w500,
    fontVariations: [FontVariation('wght', 500)],
    color: AppColors.lime700,
  );
}
