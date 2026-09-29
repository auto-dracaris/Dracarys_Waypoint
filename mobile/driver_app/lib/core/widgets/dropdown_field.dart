import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_text.dart';

/// Grey 44 px select box with a chevron (Figma "Issue Type").
class DropdownField<T> extends StatelessWidget {
  const DropdownField({
    super.key,
    required this.value,
    required this.options,
    required this.label,
    required this.onChanged,
  });

  final T value;
  final List<T> options;
  final String Function(T) label;
  final ValueChanged<T> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      key: const Key('dropdown-field'),
      height: 44,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: AppColors.gray50,
        border: Border.all(color: AppColors.neutral300),
        borderRadius: BorderRadius.circular(8),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<T>(
          value: value,
          isExpanded: true,
          style: AppText.textSmRegular,
          borderRadius: BorderRadius.circular(8),
          icon: const Icon(Icons.expand_more,
              size: 18, color: AppColors.inkSecondary),
          items: [
            for (final o in options)
              DropdownMenuItem<T>(value: o, child: Text(label(o))),
          ],
          onChanged: (v) {
            if (v != null) onChanged(v);
          },
        ),
      ),
    );
  }
}
