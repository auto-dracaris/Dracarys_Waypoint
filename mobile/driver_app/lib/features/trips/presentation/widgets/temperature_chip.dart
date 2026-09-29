import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/label_chip.dart';
import '../../domain/order.dart';

/// "Chilled" / "Ambient" label. The delivery screens show Ambient in amber
/// with a crate icon; the stop overview shows it in red.
class TemperatureChip extends StatelessWidget {
  const TemperatureChip(this.temperature, {super.key, this.delivery = false});

  final Temperature temperature;
  final bool delivery;

  @override
  Widget build(BuildContext context) {
    return switch (temperature) {
      Temperature.chilled => const LabelChip(
          label: 'Chilled',
          icon: Icons.ac_unit,
          background: AppColors.blue100,
          foreground: AppColors.blue700,
        ),
      Temperature.ambient when delivery => const LabelChip(
          label: 'Ambient',
          icon: Icons.inventory_2,
          background: AppColors.yellow100,
          foreground: AppColors.yellow700,
        ),
      Temperature.ambient => const LabelChip(
          label: 'Ambient',
          icon: Icons.ac_unit,
          background: AppColors.red100,
          foreground: AppColors.red700,
        ),
    };
  }
}
