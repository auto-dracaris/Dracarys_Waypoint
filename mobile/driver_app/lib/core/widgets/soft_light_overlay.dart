import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';

/// Paints [child] with the `soft-light` blend mode against whatever is already
/// drawn beneath it (Flutter has no built-in backdrop blend widget).
class SoftLightOverlay extends SingleChildRenderObjectWidget {
  const SoftLightOverlay({super.key, super.child});

  @override
  RenderObject createRenderObject(BuildContext context) =>
      _RenderSoftLight();
}

class _RenderSoftLight extends RenderProxyBox {
  @override
  void paint(PaintingContext context, Offset offset) {
    context.canvas.saveLayer(
      offset & size,
      Paint()..blendMode = BlendMode.softLight,
    );
    super.paint(context, offset);
    context.canvas.restore();
  }
}
