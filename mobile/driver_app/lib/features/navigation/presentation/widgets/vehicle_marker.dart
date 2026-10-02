import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';

/// Top-down delivery van in the app's yellow and ink, pointing along
/// [heading] (compass degrees, 0 = up/north).
class VehicleMarker extends StatelessWidget {
  const VehicleMarker({super.key, required this.heading, this.size = 44});

  final double heading;
  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      key: const Key('vehicle-marker'),
      width: size,
      height: size,
      child: Transform.rotate(
        angle: heading * math.pi / 180,
        child: CustomPaint(painter: _VanPainter()),
      ),
    );
  }
}

class _VanPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width, h = size.height;
    final body = RRect.fromRectAndRadius(
      Rect.fromCenter(
          center: Offset(w / 2, h / 2), width: w * 0.46, height: h * 0.9),
      Radius.circular(w * 0.12),
    );
    // Soft ground shadow so the van reads on any map colour.
    canvas.drawRRect(
      body.shift(Offset(0, h * 0.03)),
      Paint()
        ..color = const Color(0x40000000)
        ..maskFilter = MaskFilter.blur(BlurStyle.normal, w * 0.04),
    );
    canvas.drawRRect(body, Paint()..color = AppColors.primary);
    canvas.drawRRect(
      body,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = w * 0.05
        ..color = AppColors.ink,
    );
    // Windscreen at the front (top), roof line behind it.
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.31, h * 0.13, w * 0.38, h * 0.2),
        Radius.circular(w * 0.05),
      ),
      Paint()..color = AppColors.ink,
    );
    canvas.drawLine(
      Offset(w * 0.34, h * 0.42),
      Offset(w * 0.66, h * 0.42),
      Paint()
        ..color = AppColors.ink
        ..strokeWidth = w * 0.03,
    );
  }

  @override
  bool shouldRepaint(_VanPainter old) => false;
}
