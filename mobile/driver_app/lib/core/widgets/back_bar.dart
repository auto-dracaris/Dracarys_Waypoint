import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../theme/app_colors.dart';

/// White 52 px bar with a "← My trips" link (Figma "top-nav").
class BackBar extends StatelessWidget {
  const BackBar({super.key, required this.onBack, this.label = 'My trips'});

  final VoidCallback onBack;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.surface,
      child: SafeArea(
        bottom: false,
        child: SizedBox(
          height: 52,
          child: Align(
            alignment: Alignment.centerLeft,
            child: InkWell(
              key: const Key('back-bar-button'),
              onTap: onBack,
              child: Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SvgPicture.asset('assets/images/back_arrow.svg',
                        width: 18, height: 14),
                    const SizedBox(width: 6),
                    Text(
                      label,
                      style: const TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 14,
                        fontWeight: FontWeight.w400,
                        color: AppColors.backLink,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
