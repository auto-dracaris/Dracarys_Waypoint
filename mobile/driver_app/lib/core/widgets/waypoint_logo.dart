import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// The Waypoint logo mark (exported from Figma, 70 x 42).
class WaypointLogo extends StatelessWidget {
  const WaypointLogo({super.key, this.height = 42});

  final double height;

  @override
  Widget build(BuildContext context) {
    return SvgPicture.asset(
      'assets/images/logo_mark.svg',
      key: const Key('waypoint-logo'),
      height: height,
      width: height * 70 / 42,
    );
  }
}
