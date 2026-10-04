import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_text.dart';

enum QuantityStepperStyle {
  /// Grey tray with two white buttons (delivery quantities).
  boxed,

  /// One outlined control with joined buttons (issue quantity).
  joined,
}

/// − value + control. Buttons stop at [min] / [max].
class QuantityStepper extends StatelessWidget {
  const QuantityStepper({
    super.key,
    required this.value,
    required this.onChanged,
    this.min = 0,
    this.max = 999,
    this.style = QuantityStepperStyle.boxed,
  });

  final int value;
  final int min;
  final int max;
  final ValueChanged<int> onChanged;
  final QuantityStepperStyle style;

  @override
  Widget build(BuildContext context) {
    if (style == QuantityStepperStyle.joined) return _joined();
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _StepButton(
            key: const Key('stepper-minus'),
            icon: Icons.remove_rounded,
            enabled: value > min,
            onTap: () => onChanged(value - 1),
          ),
          const SizedBox(width: 4),
          SizedBox(
            width: 36,
            height: 32,
            child: Center(
              child: Text('$value', style: AppText.textSmBold),
            ),
          ),
          const SizedBox(width: 4),
          _StepButton(
            key: const Key('stepper-plus'),
            icon: Icons.add_rounded,
            enabled: value < max,
            onTap: () => onChanged(value + 1),
          ),
        ],
      ),
    );
  }
}

extension on QuantityStepper {
  Widget _joined() {
    Widget button(Key key, IconData icon, bool enabled, VoidCallback onTap) =>
        Material(
          key: key,
          color: AppColors.gray50,
          shape: const Border.symmetric(
              vertical: BorderSide(color: AppColors.neutral300)),
          child: InkWell(
            onTap: enabled ? onTap : null,
            child: Padding(
              padding: const EdgeInsets.all(10),
              child: Icon(icon,
                  size: 18,
                  color: enabled ? AppColors.inkSecondary : AppColors.inkFaint),
            ),
          ),
        );

    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        border: Border.all(color: AppColors.neutral300),
        borderRadius: BorderRadius.circular(8),
      ),
      child: IntrinsicHeight(
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            button(const Key('stepper-minus'), Icons.remove, value > min,
                () => onChanged(value - 1)),
            Container(
              color: AppColors.surface,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              alignment: Alignment.center,
              child: Text('$value', style: AppText.textSmBold),
            ),
            button(const Key('stepper-plus'), Icons.add, value < max,
                () => onChanged(value + 1)),
          ],
        ),
      ),
    );
  }
}

class _StepButton extends StatelessWidget {
  const _StepButton({
    super.key,
    required this.icon,
    required this.enabled,
    required this.onTap,
  });

  final IconData icon;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(4),
        side: const BorderSide(color: AppColors.neutral300),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(4),
        onTap: enabled ? onTap : null,
        child: SizedBox(
          width: 32,
          height: 32,
          child: Icon(icon,
              size: 20, color: enabled ? AppColors.ink : AppColors.inkFaint),
        ),
      ),
    );
  }
}
