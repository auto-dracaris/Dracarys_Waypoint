import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_text.dart';

/// Bordered tile with an icon, a small label and a large value
/// (Figma "Delivery window" / "Planned arrival").
class InfoTile extends StatelessWidget {
  const InfoTile({
    super.key,
    required this.label,
    required this.value,
    this.icon,
    this.valueColor,
  });

  final String label;
  final String value;
  final IconData? icon;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 18, color: AppColors.inkSecondary),
            const SizedBox(width: 10),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: AppText.textXsRegular
                        .copyWith(color: AppColors.inkSecondary)),
                const SizedBox(height: 2),
                Text(value,
                    style: AppText.textLgMedium
                        .copyWith(color: valueColor ?? AppColors.ink)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
