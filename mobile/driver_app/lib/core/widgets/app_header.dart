import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../theme/app_colors.dart';
import 'waypoint_logo.dart';

/// White top bar with the logo and the notification bell (Figma "header").
class AppHeader extends StatelessWidget {
  const AppHeader({super.key, required this.onBellTap});

  final VoidCallback onBellTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.surface,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: SafeArea(
        bottom: false,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const WaypointLogo(height: 38),
            InkResponse(
              key: const Key('bell-button'),
              onTap: onBellTap,
              child: Semantics(
                label: 'Notifications',
                button: true,
                child: SvgPicture.asset('assets/images/bell.svg',
                    width: 36, height: 36),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
