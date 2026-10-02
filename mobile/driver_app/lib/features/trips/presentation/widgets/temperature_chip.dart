import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/label_chip.dart';
import '../../domain/order.dart';

/// Where the chip appears; Figma colours "Ambient" differently per screen.
enum TemperatureChipStyle {
  /// Stop overview: Ambient in red with a snowflake.
  overview,

  /// Arrived screen: Ambient in amber with a crate.
  delivery,

  /// Delivery summary and issue form: Ambient in red with a sun.
  summary,
}

/// "Chilled" / "Ambient" label.
class TemperatureChip extends StatelessWidget {
  const TemperatureChip(
    this.temperature, {
    super.key,
    this.style = TemperatureChipStyle.overview,
    this.large = false,
  });

  final Temperature temperature;
  final TemperatureChipStyle style;
  final bool large;

  @override
  Widget build(BuildContext context) {
    return switch ((temperature, style)) {
      (Temperature.chilled, _) => LabelChip(
          label: 'Chilled',
          icon: Icons.ac_unit,
          background: AppColors.blue100,
          foreground: AppColors.blue700,
          large: large,
        ),
      (Temperature.ambient, TemperatureChipStyle.delivery) => LabelChip(
          label: 'Ambient',
          icon: Icons.inventory_2,
          background: AppColors.yellow100,
          foreground: AppColors.yellow700,
          large: large,
        ),
      (Temperature.ambient, TemperatureChipStyle.summary) => LabelChip(
          label: 'Ambient',
          icon: Icons.wb_sunny,
          background: AppColors.red100,
          foreground: AppColors.red700,
          large: large,
        ),
      (Temperature.ambient, TemperatureChipStyle.overview) => LabelChip(
          label: 'Ambient',
          icon: Icons.ac_unit,
          background: AppColors.red100,
          foreground: AppColors.red700,
          large: large,
        ),
    };
  }
}
