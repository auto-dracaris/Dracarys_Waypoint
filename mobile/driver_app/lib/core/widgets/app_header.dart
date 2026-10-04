import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../theme/app_colors.dart';
import 'waypoint_logo.dart';

/// White top bar with the logo and the notification bell (Figma "header").
/// When [onChatTap] is given, a chat button for the assistant sits beside the
/// bell.
class AppHeader extends StatelessWidget {
  const AppHeader({super.key, required this.onBellTap, this.onChatTap});

  final VoidCallback onBellTap;
  final VoidCallback? onChatTap;

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
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (onChatTap != null) ...[
                  Semantics(
                    label: 'Assistant',
                    button: true,
                    child: Material(
                      color: AppColors.yellow100,
                      shape: const CircleBorder(),
                      child: InkResponse(
                        key: const Key('chat-button'),
                        onTap: onChatTap,
                        customBorder: const CircleBorder(),
                        child: const SizedBox(
                          width: 36,
                          height: 36,
                          child: Icon(
                            Icons.auto_awesome_rounded,
                            size: 20,
                            color: AppColors.ink,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                ],
                InkResponse(
                  key: const Key('bell-button'),
                  onTap: onBellTap,
                  child: Semantics(
                    label: 'Notifications',
                    button: true,
                    child: SvgPicture.asset(
                      'assets/images/bell.svg',
                      width: 36,
                      height: 36,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
