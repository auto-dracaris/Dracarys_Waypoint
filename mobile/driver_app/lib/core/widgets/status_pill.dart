import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_text.dart';

enum StatusKind { success, danger, warning, neutral }

/// Rounded status label (Figma "Label", size L).
class StatusPill extends StatelessWidget {
  const StatusPill({
    super.key,
    required this.label,
    this.kind = StatusKind.neutral,
    this.onLongPress,
  });

  final String label;
  final StatusKind kind;
  final VoidCallback? onLongPress;

  (Color, Color) get _colors => switch (kind) {
        StatusKind.success => (AppColors.successBg, AppColors.success),
        StatusKind.danger => (AppColors.dangerBg, AppColors.danger),
        StatusKind.warning => (AppColors.warningBg, AppColors.warning),
        StatusKind.neutral => (AppColors.border, AppColors.inkMuted),
      };

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = _colors;
    return GestureDetector(
      onLongPress: onLongPress,
      child: Container(
        height: 32,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Text(label, style: AppText.label.copyWith(color: fg)),
      ),
    );
  }
}
