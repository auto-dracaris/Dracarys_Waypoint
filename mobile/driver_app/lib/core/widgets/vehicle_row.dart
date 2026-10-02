import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_text.dart';
import 'connection_pill.dart';

/// White row under the top bar: truck icon + plate on the left, connectivity
/// pill on the right (Figma "vehicle-row").
class VehicleRow extends StatelessWidget {
  const VehicleRow({super.key, required this.plate});

  final String plate;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.surface,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              const Icon(Icons.local_shipping_rounded,
                  size: 24, color: AppColors.ink),
              const SizedBox(width: 12),
              Text(plate, style: AppText.textSmMedium),
            ],
          ),
          const ConnectionPill(),
        ],
      ),
    );
  }
}
