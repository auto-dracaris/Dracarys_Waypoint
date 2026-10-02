import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../theme/app_colors.dart';
import '../theme/app_text.dart';
import 'connection_label.dart';

/// Single-row header used on delivery screens: "← My trips" on the left,
/// truck + plate and the connectivity label on the right.
class TripHeaderBar extends StatelessWidget {
  const TripHeaderBar({super.key, required this.plate, required this.onBack});

  final String plate;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.surface,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              InkWell(
                key: const Key('back-bar-button'),
                onTap: onBack,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SvgPicture.asset('assets/images/back_arrow.svg',
                        width: 18, height: 14),
                    const SizedBox(width: 6),
                    const Text(
                      'My trips',
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: AppColors.backLink,
                      ),
                    ),
                  ],
                ),
              ),
              Row(
                children: [
                  const Icon(Icons.local_shipping_rounded,
                      size: 24, color: AppColors.ink),
                  const SizedBox(width: 6),
                  Text(plate, style: AppText.textSmMedium),
                  const SizedBox(width: 12),
                  const ConnectionLabel(),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
