import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text.dart';
import '../../../../core/widgets/soft_light_overlay.dart';
import '../../domain/vehicle.dart';

/// Yellow banner with the driver's vehicle (Figma "VehicleCard").
class VehicleBanner extends StatelessWidget {
  const VehicleBanner({super.key, required this.vehicle});

  final Vehicle vehicle;

  // The van image is a crop of a larger source; fractions come from Figma.
  static const _vanW = 127.0, _vanH = 98.0;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 112,
      clipBehavior: Clip.hardEdge,
      decoration: const BoxDecoration(
        color: AppColors.brandYellow,
        border: Border.symmetric(
          horizontal: BorderSide(color: AppColors.border),
        ),
      ),
      child: Stack(
        children: [
          Positioned(
            left: -6,
            top: -1,
            width: 451,
            height: 137,
            child: SoftLightOverlay(
              child: Image.asset('assets/images/vehicle_texture.png',
                  fit: BoxFit.cover, cacheWidth: 902),
            ),
          ),
          Positioned(
            left: 0,
            top: 7,
            width: _vanW,
            height: _vanH,
            child: Transform.flip(
              flipX: true,
              child: ClipRect(
                child: Stack(
                  children: [
                    Positioned(
                      left: 0,
                      top: -0.7083 * _vanH,
                      width: 1.7698 * _vanW,
                      height: 2.3009 * _vanH,
                      child: Image.asset('assets/images/van.png',
                          fit: BoxFit.fill),
                    ),
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            right: 16,
            top: 14,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(vehicle.plate,
                    style: AppText.displayMd
                        .copyWith(color: AppColors.vehicleText)),
                Text(vehicle.type,
                    style: AppText.textMdMedium
                        .copyWith(color: AppColors.inkSecondary)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
