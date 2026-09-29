import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

/// Placeholder mark until the real logo asset is exported from Figma.
class WaypointLogo extends StatelessWidget {
  const WaypointLogo({super.key, this.size = 72});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      key: const Key('waypoint-logo'),
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.circular(size * 0.22),
      ),
      child: Text(
        'W',
        style: TextStyle(
          fontSize: size * 0.6,
          fontWeight: FontWeight.w900,
          color: AppColors.ink,
        ),
      ),
    );
  }
}
