import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

/// A map with a rounded bottom sheet laid over its lower edge, plus the small
/// drag handle Figma draws on the map. The layout is as tall as the map area
/// plus the sheet, so it scrolls naturally inside a scroll view.
class MapSheetLayout extends StatelessWidget {
  const MapSheetLayout({
    super.key,
    required this.map,
    required this.sheet,
    this.mapHeight = 240,
  });

  final Widget map;
  final Widget sheet;
  final double mapHeight;

  static const _overlap = 20.0;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Positioned(
          left: 0,
          right: 0,
          top: 0,
          height: mapHeight + _overlap,
          child: map,
        ),
        Positioned(
          top: mapHeight - 12,
          left: 0,
          right: 0,
          child: Center(
            child: Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFFCCCCCC),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
        ),
        Column(
          children: [
            SizedBox(height: mapHeight),
            Container(
              width: double.infinity,
              decoration: const BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              child: sheet,
            ),
          ],
        ),
      ],
    );
  }
}
