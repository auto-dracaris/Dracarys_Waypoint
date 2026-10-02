import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_text.dart';

typedef Strokes = List<List<Offset>>;

/// A box the driver signs in with a finger (Figma "signature-box"). The parent
/// owns the strokes so they survive a rebuild and can be validated.
class SignaturePad extends StatefulWidget {
  const SignaturePad({
    super.key,
    required this.strokes,
    required this.onChanged,
    this.height = 120,
  });

  final Strokes strokes;
  final ValueChanged<Strokes> onChanged;
  final double height;

  /// A tap leaves a one-point stroke; only real drawing counts as a signature.
  static bool isSigned(Strokes strokes) => strokes.any((s) => s.length > 1);

  @override
  State<SignaturePad> createState() => _SignaturePadState();
}

class _SignaturePadState extends State<SignaturePad> {
  // Several pointer events can arrive between two rebuilds, so the working
  // strokes live here rather than being read back from the parent each time.
  late Strokes _strokes = widget.strokes;

  @override
  void didUpdateWidget(SignaturePad old) {
    super.didUpdateWidget(old);
    if (!identical(widget.strokes, old.strokes)) _strokes = widget.strokes;
  }

  void _set(Strokes next) {
    setState(() => _strokes = next);
    widget.onChanged(next);
  }

  @override
  Widget build(BuildContext context) {
    final strokes = _strokes;
    final height = widget.height;
    final signed = SignaturePad.isSigned(strokes);
    return Container(
      height: height,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: AppColors.gray50,
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Stack(
        children: [
          Positioned.fill(
            // Raw pointer events give every point of the stroke, and the eager
            // recognizer claims the gesture so the page doesn't scroll while
            // the driver signs.
            child: RawGestureDetector(
              gestures: {
                EagerGestureRecognizer:
                    GestureRecognizerFactoryWithHandlers<EagerGestureRecognizer>(
                  EagerGestureRecognizer.new,
                  (_) {},
                ),
              },
              child: Listener(
                key: const Key('signature-surface'),
                behavior: HitTestBehavior.opaque,
                onPointerDown: (e) => _set([
                  ..._strokes,
                  [e.localPosition],
                ]),
                onPointerMove: (e) {
                  if (_strokes.isEmpty) return;
                  _set([
                    ..._strokes.sublist(0, _strokes.length - 1),
                    [..._strokes.last, e.localPosition],
                  ]);
                },
                child: CustomPaint(painter: _InkPainter(strokes)),
              ),
            ),
          ),
          if (strokes.isEmpty)
            Center(
              child: IgnorePointer(
                child: Text('Sign here',
                    style: AppText.textSmRegular
                        .copyWith(color: AppColors.inkFaint)),
              ),
            ),
          if (signed)
            Positioned(
              left: 12,
              bottom: 8,
              child: IgnorePointer(
                child: Text('Signature captured ✓',
                    style: AppText.textSmSemibold
                        .copyWith(color: AppColors.lime700)),
              ),
            ),
          if (signed)
            Positioned(
              right: 4,
              bottom: 0,
              child: TextButton(
                onPressed: () => _set(const []),
                style: TextButton.styleFrom(
                  minimumSize: const Size(48, 32),
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                ),
                child: Text('Clear',
                    style: AppText.textXsRegular
                        .copyWith(color: AppColors.inkMuted)),
              ),
            ),
        ],
      ),
    );
  }
}

class _InkPainter extends CustomPainter {
  _InkPainter(this.strokes);

  final Strokes strokes;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.ink
      ..strokeWidth = 2.5
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..style = PaintingStyle.stroke;
    for (final stroke in strokes) {
      if (stroke.length < 2) continue;
      final path = Path()..moveTo(stroke.first.dx, stroke.first.dy);
      for (final p in stroke.skip(1)) {
        path.lineTo(p.dx, p.dy);
      }
      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(_InkPainter old) => old.strokes != strokes;
}
