import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_text.dart';

enum AppButtonVariant { filled, outlined, danger, dangerOutlined }

/// The app's button (Figma "Button"): 4 px radius, 14 px semibold label,
/// optional leading / trailing icon.
class AppButton extends StatelessWidget {
  const AppButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.variant = AppButtonVariant.filled,
    this.leadingIcon,
    this.leading,
    this.trailingIcon,
    this.dense = false,
    this.bold = false,
    this.padding = 12,
    this.radius = 4,
    this.backgroundColor,
    this.isLoading = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final AppButtonVariant variant;
  final IconData? leadingIcon;

  /// A custom leading widget (e.g. an SVG); wins over [leadingIcon].
  final Widget? leading;
  final IconData? trailingIcon;

  /// Smaller padding, used inside cards.
  final bool dense;

  /// Bold (700) label instead of semibold, used for primary calls to action.
  final bool bold;

  /// Uniform padding when not [dense].
  final double padding;
  final double radius;

  /// Overrides the variant's background (e.g. the brand yellow of some CTAs).
  final Color? backgroundColor;
  final bool isLoading;

  (Color bg, Color fg, Color? border) get _colors => switch (variant) {
        AppButtonVariant.filled => (AppColors.primary, AppColors.ink, null),
        AppButtonVariant.outlined =>
          (AppColors.surface, AppColors.ink, AppColors.border),
        AppButtonVariant.danger => (AppColors.red500, AppColors.card, null),
        AppButtonVariant.dangerOutlined =>
          (AppColors.red50, AppColors.red700, AppColors.red500),
      };

  @override
  Widget build(BuildContext context) {
    final (bg, fg, border) = _colors;
    final enabled = onPressed != null && !isLoading;
    final borderRadius = BorderRadius.circular(radius);
    final button = Material(
      color: backgroundColor ?? bg,
      shape: RoundedRectangleBorder(
        borderRadius: borderRadius,
        side: border == null ? BorderSide.none : BorderSide(color: border),
      ),
      child: InkWell(
        borderRadius: borderRadius,
        onTap: enabled ? onPressed : null,
        child: Padding(
          padding: dense
              ? const EdgeInsets.symmetric(horizontal: 8, vertical: 6)
              : EdgeInsets.all(padding),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: isLoading
                ? [
                    SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                          strokeWidth: 2.5, color: fg),
                    ),
                  ]
                : [
                    if (leading != null || leadingIcon != null) ...[
                      leading ?? Icon(leadingIcon, size: 20, color: fg),
                      const SizedBox(width: 8),
                    ],
                    Flexible(
                      child: Text(label,
                          textAlign: TextAlign.center,
                          style: (bold ? AppText.textSmBold : AppText.textSmSemibold)
                              .copyWith(color: fg)),
                    ),
                    if (trailingIcon != null) ...[
                      const SizedBox(width: 8),
                      Icon(trailingIcon, size: 18, color: fg),
                    ],
                  ],
          ),
        ),
      ),
    );
    return onPressed == null && !isLoading
        ? Opacity(opacity: 0.5, child: button)
        : button;
  }
}
