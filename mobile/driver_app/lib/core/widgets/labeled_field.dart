import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_text.dart';

/// A label above a bordered text input (Figma "input-group" / "notes-input").
class LabeledField extends StatelessWidget {
  const LabeledField({
    super.key,
    required this.label,
    this.hint,
    this.controller,
    this.onChanged,
    this.errorText,
    this.minLines = 1,
    this.maxLines = 1,
    this.fillColor = AppColors.surface,
    this.borderColor = const Color(0xFFD1D5DB),
    this.labelStyle,
    this.caption,
    this.fieldKey,
  });

  final String label;
  final String? hint;
  final TextEditingController? controller;
  final ValueChanged<String>? onChanged;
  final String? errorText;
  final int minLines;
  final int maxLines;
  final Color fillColor;
  final Color borderColor;
  final TextStyle? labelStyle;

  /// Small helper line under the label (e.g. "Enter number of damaged cases").
  final String? caption;

  /// Key for the underlying text field, so tests and callers can find it.
  final Key? fieldKey;

  @override
  Widget build(BuildContext context) {
    final border = OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: BorderSide(color: borderColor),
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: labelStyle ??
                AppText.textXsSemibold.copyWith(color: AppColors.inkSecondary)),
        if (caption != null)
          Text(caption!,
              style:
                  AppText.textXsRegular.copyWith(color: AppColors.inkMuted)),
        const SizedBox(height: 6),
        TextField(
          key: fieldKey,
          controller: controller,
          onChanged: onChanged,
          minLines: minLines,
          maxLines: maxLines,
          style: AppText.textSmRegular,
          decoration: InputDecoration(
            isDense: true,
            filled: true,
            fillColor: fillColor,
            hintText: hint,
            hintStyle:
                AppText.textSmRegular.copyWith(color: AppColors.inkFaint),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            enabledBorder: border,
            focusedBorder: border.copyWith(
                borderSide: const BorderSide(color: AppColors.ink)),
          ),
        ),
        if (errorText != null)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(errorText!,
                style: AppText.textXsRegular.copyWith(color: AppColors.red700)),
          ),
      ],
    );
  }
}
