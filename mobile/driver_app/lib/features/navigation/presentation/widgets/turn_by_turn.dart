import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text.dart';
import '../../data/route_maneuvers.dart';

/// "250 m", "1.2 km". Short distances round to 10 m so the number does not
/// flicker on every position update.
String formatDistance(double meters) {
  if (meters >= 1000) return '${(meters / 1000).toStringAsFixed(1)} km';
  final rounded = (meters / 10).round() * 10;
  return '${rounded < 10 ? 10 : rounded} m';
}

IconData turnIcon(TurnKind? kind) => switch (kind) {
  null => Icons.arrow_upward_rounded,
  TurnKind.slightLeft => Icons.turn_slight_left_rounded,
  TurnKind.left => Icons.turn_left_rounded,
  TurnKind.sharpLeft => Icons.turn_sharp_left_rounded,
  TurnKind.slightRight => Icons.turn_slight_right_rounded,
  TurnKind.right => Icons.turn_right_rounded,
  TurnKind.sharpRight => Icons.turn_sharp_right_rounded,
  TurnKind.uTurn => Icons.u_turn_left_rounded,
};

/// The blue instruction card at the top of live navigation (Figma "7 —
/// Turn-by-Turn Navigation"): the next turn, how far away it is, where the road
/// leads, and the turn after it.
class TurnBanner extends StatelessWidget {
  const TurnBanner({
    super.key,
    required this.next,
    required this.distanceToNext,
    required this.destination,
    required this.remainingMeters,
    this.then,
    this.trailing,
  });

  /// The upcoming turn; null when the road runs straight to [destination].
  final Maneuver? next;
  final double distanceToNext;
  final String destination;
  final double remainingMeters;

  /// The turn after [next], previewed in the "Then" strip.
  final Maneuver? then;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final straight = next == null;
    final title = formatDistance(straight ? remainingMeters : distanceToNext);
    final subtitle = straight
        ? 'Continue to $destination'
        : '${next!.kind.label} toward $destination';

    return Material(
      key: const Key('turn-banner'),
      color: AppColors.blue700,
      elevation: 6,
      borderRadius: BorderRadius.circular(20),
      clipBehavior: Clip.antiAlias,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 14, 12),
            child: Row(
              children: [
                Icon(turnIcon(next?.kind), size: 40, color: Colors.white),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        key: const Key('turn-distance'),
                        style: AppText.displayXs.copyWith(color: Colors.white),
                      ),
                      Text(
                        subtitle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppText.textSmSemibold.copyWith(
                          color: Colors.white.withValues(alpha: 0.9),
                        ),
                      ),
                    ],
                  ),
                ),
                ?trailing,
              ],
            ),
          ),
          if (then != null)
            Container(
              key: const Key('turn-then'),
              width: double.infinity,
              color: AppColors.blue800,
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'Then',
                    style: AppText.textSmMedium.copyWith(color: Colors.white),
                  ),
                  const SizedBox(width: 6),
                  Icon(turnIcon(then!.kind), size: 20, color: Colors.white),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// A round white button used on the navigation chrome.
class NavRoundButton extends StatelessWidget {
  const NavRoundButton({
    super.key,
    required this.onTap,
    required this.child,
    this.size = 48,
  });

  final VoidCallback onTap;
  final Widget child;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.card,
      shape: const CircleBorder(side: BorderSide(color: AppColors.border)),
      elevation: 3,
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: SizedBox(
          width: size,
          height: size,
          child: Center(child: child),
        ),
      ),
    );
  }
}

/// The bottom strip of live navigation: time left in red, then distance and
/// arrival time, with a map-mode button on the left and "end" on the right.
class EtaBar extends StatelessWidget {
  const EtaBar({
    super.key,
    required this.minutes,
    required this.kmLeft,
    required this.arrival,
    required this.mapButton,
    required this.onEnd,
  });

  final int minutes;
  final double kmLeft;
  final String arrival;
  final Widget mapButton;
  final VoidCallback onEnd;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      decoration: const BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        boxShadow: [
          BoxShadow(
            color: Color(0x22000000),
            blurRadius: 12,
            offset: Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            mapButton,
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '$minutes min',
                    key: const Key('eta-minutes'),
                    style: AppText.displaySm.copyWith(
                      color: AppColors.errorPrimary,
                    ),
                  ),
                  Text(
                    '${kmLeft.toStringAsFixed(1)} km · $arrival',
                    key: const Key('eta-detail'),
                    style: AppText.textSmRegular.copyWith(
                      color: AppColors.inkSecondary,
                    ),
                  ),
                ],
              ),
            ),
            NavRoundButton(
              key: const Key('nav-toggle'),
              onTap: onEnd,
              child: const Icon(
                Icons.close_rounded,
                size: 24,
                color: AppColors.ink,
                semanticLabel: 'End navigation',
              ),
            ),
          ],
        ),
      ),
    );
  }
}
