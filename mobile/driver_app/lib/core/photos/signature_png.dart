import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/painting.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../widgets/signature_pad.dart';

/// Renders a signature as a PNG (dark ink on white) for `POST /images`. The
/// strokes are in the pad's own coordinates, so they are scaled to fit.
Future<Uint8List> signaturePng(
  Strokes strokes, {
  double width = 600,
  double height = 240,
}) async {
  final points = [for (final s in strokes) ...s];
  var minX = points.first.dx, maxX = minX;
  var minY = points.first.dy, maxY = minY;
  for (final p in points) {
    if (p.dx < minX) minX = p.dx;
    if (p.dx > maxX) maxX = p.dx;
    if (p.dy < minY) minY = p.dy;
    if (p.dy > maxY) maxY = p.dy;
  }
  const margin = 20.0;
  final w = (maxX - minX).clamp(1.0, double.infinity);
  final h = (maxY - minY).clamp(1.0, double.infinity);
  final sx = (width - 2 * margin) / w, sy = (height - 2 * margin) / h;
  final scale = sx < sy ? sx : sy;
  final dx = (width - w * scale) / 2 - minX * scale;
  final dy = (height - h * scale) / 2 - minY * scale;

  final recorder = ui.PictureRecorder();
  final canvas = Canvas(recorder, Rect.fromLTWH(0, 0, width, height));
  canvas.drawRect(
    Rect.fromLTWH(0, 0, width, height),
    Paint()..color = const Color(0xFFFFFFFF),
  );
  final ink = Paint()
    ..color = const Color(0xFF2B2422)
    ..style = PaintingStyle.stroke
    ..strokeWidth = 4
    ..strokeCap = StrokeCap.round
    ..strokeJoin = StrokeJoin.round;
  for (final stroke in strokes) {
    if (stroke.length < 2) continue;
    final path = Path()
      ..moveTo(stroke.first.dx * scale + dx, stroke.first.dy * scale + dy);
    for (final p in stroke.skip(1)) {
      path.lineTo(p.dx * scale + dx, p.dy * scale + dy);
    }
    canvas.drawPath(path, ink);
  }
  final image = await recorder.endRecording().toImage(
    width.round(),
    height.round(),
  );
  final data = await image.toByteData(format: ui.ImageByteFormat.png);
  return data!.buffer.asUint8List();
}

/// Seam so widget tests, which cannot rasterise under fake time, can skip it.
final signatureEncoderProvider = Provider<Future<Uint8List> Function(Strokes)>(
  (_) => signaturePng,
);
