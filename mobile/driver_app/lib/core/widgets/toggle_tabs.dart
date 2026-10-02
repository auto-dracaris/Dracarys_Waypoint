import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_text.dart';

/// Two or more equal-width pill tabs; the selected one is brand yellow
/// (Figma "toggle-container": Signature / Photo).
class ToggleTabs extends StatelessWidget {
  const ToggleTabs({
    super.key,
    required this.labels,
    required this.selectedIndex,
    required this.onChanged,
  });

  final List<String> labels;
  final int selectedIndex;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (var i = 0; i < labels.length; i++) ...[
          if (i > 0) const SizedBox(width: 8),
          Expanded(
            child: InkWell(
              borderRadius: BorderRadius.circular(8),
              onTap: () => onChanged(i),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 8),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: i == selectedIndex
                      ? AppColors.brandYellow
                      : AppColors.background,
                  border: i == selectedIndex
                      ? null
                      : Border.all(color: AppColors.border),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  labels[i],
                  style: i == selectedIndex
                      ? AppText.textSmSemibold
                      : AppText.textSmRegular
                          .copyWith(color: AppColors.inkMuted),
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }
}
