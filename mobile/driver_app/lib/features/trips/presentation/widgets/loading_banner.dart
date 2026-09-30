import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text.dart';

/// Yellow strip shown while the loading team is still preparing a trip.
class LoadingBanner extends StatelessWidget {
  const LoadingBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: AppColors.yellow200,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Row(
        children: [
          SvgPicture.asset('assets/images/package.svg', width: 20, height: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Loading in progress', style: AppText.textSmSemibold),
                const SizedBox(height: 6),
                Text(
                  'Waiting for the loading team to finish.',
                  style: AppText.textXsRegular
                      .copyWith(color: AppColors.inkSecondary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
