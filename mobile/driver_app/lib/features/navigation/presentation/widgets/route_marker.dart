import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text.dart';

/// Numbered stop marker on the route map (Figma "roadmarks"): completed stops
/// are filled with a check badge, upcoming ones are outlined.
class RouteMarker extends StatelessWidget {
  const RouteMarker({super.key, required this.number, required this.completed});

  final int number;
  final bool completed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 32,
      height: 32,
      child: Stack(
        children: [
          Positioned(
            left: 4,
            top: 4,
            child: Container(
              width: 24,
              height: 24,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: completed ? AppColors.lime800 : AppColors.card,
                shape: BoxShape.circle,
                border: completed
                    ? Border.all(color: AppColors.card)
                    : Border.all(color: AppColors.lime800, width: 2),
              ),
              child: Text(
                '$number',
                style: (completed ? AppText.textXsMedium : AppText.textXsMedium)
                    .copyWith(
                  fontWeight: completed ? FontWeight.w500 : FontWeight.w600,
                  fontVariations: [
                    FontVariation('wght', completed ? 500 : 600)
                  ],
                  color: completed ? AppColors.card : AppColors.lime800,
                ),
              ),
            ),
          ),
          if (completed)
            Positioned(
              key: Key('marker-check-$number'),
              left: 15,
              top: 0,
              child: SvgPicture.asset('assets/images/check_badge.svg',
                  width: 17, height: 17),
            ),
        ],
      ),
    );
  }
}
