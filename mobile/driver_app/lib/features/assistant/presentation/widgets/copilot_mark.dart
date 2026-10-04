import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';

/// The Trip Copilot mark (Figma "Trip Copilot"): a dark circle with a cluster
/// of yellow dots that is brightest at its heart and fades toward the edge.
/// While [animate] is on, the dots brighten and dim in a wave that travels across
/// the cluster, like a signal flowing through it. With animations turned off
/// in the system settings it holds still.
class CopilotMark extends StatefulWidget {
  const CopilotMark({
    super.key,
    this.size = 56,
    this.animate = true,
    this.period = const Duration(milliseconds: 2600),
  });

  final double size;
  final bool animate;

  /// One full wave. Shorter looks busier (used while the assistant is working).
  final Duration period;

  @override
  State<CopilotMark> createState() => _CopilotMarkState();
}

class _CopilotMarkState extends State<CopilotMark>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: widget.period,
  );

  bool _reduceMotion = false;

  /// Runs the loop only when asked to and when the system allows motion: a loop
  /// that is not needed would keep redrawing (and draining the battery).
  void _sync() {
    final run = widget.animate && !_reduceMotion;
    if (run && !_c.isAnimating) {
      _c.repeat();
    } else if (!run && _c.isAnimating) {
      _c.stop();
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _reduceMotion = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    _sync();
  }

  @override
  void didUpdateWidget(CopilotMark old) {
    super.didUpdateWidget(old);
    _c.duration = widget.period;
    _sync();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: widget.size,
      height: widget.size,
      child: ClipOval(
        child: ColoredBox(
          color: AppColors.ink,
          child: AnimatedBuilder(
            animation: _c,
            builder: (_, _) => CustomPaint(
              painter: CopilotDotsPainter(
                phase: _reduceMotion || !widget.animate ? 0.3 : _c.value,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Paints the dot cluster. [phase] is 0 to 1 through one wave.
class CopilotDotsPainter extends CustomPainter {
  const CopilotDotsPainter({required this.phase});

  final double phase;

  /// Dots per side of the grid, and how far (in grid cells) the cluster reaches.
  static const grid = 9;
  static const reach = 4.0;

  /// How lit the dot at grid position ([col], [row]) is, 0 to 1, at [phase]:
  /// bright at the centre, fading outward, rippling diagonally in time.
  static double brightness(int col, int row, double phase) {
    final x = col - (grid - 1) / 2, y = row - (grid - 1) / 2;
    final d = math.sqrt(x * x + y * y) / reach;
    if (d >= 1) return 0;
    final base = math.pow(1 - d, 1.6).toDouble();
    final wave = 0.5 + 0.5 * math.sin(2 * math.pi * (phase - (x + y) * 0.07));
    return base * (0.25 + 0.75 * wave);
  }

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width;
    // The cluster sits a little up and to the right of the circle's centre.
    final centre = Offset(s * 0.56, s * 0.46);
    final step = s * 0.106;
    final paint = Paint()..style = PaintingStyle.fill;
    for (var r = 0; r < grid; r++) {
      for (var c = 0; c < grid; c++) {
        final b = brightness(c, r, phase);
        if (b < 0.02) continue;
        final at =
            centre +
            Offset((c - (grid - 1) / 2) * step, (r - (grid - 1) / 2) * step);
        paint.color = AppColors.brandYellow.withValues(alpha: 0.08 + 0.72 * b);
        canvas.drawCircle(
          at,
          s * 0.036,
          paint,
        ); // fixed size: only the colour moves
      }
    }
  }

  @override
  bool shouldRepaint(CopilotDotsPainter old) => old.phase != phase;
}

/// The floating "Trip Copilot" button: the mark in a cream pill with the name,
/// as drawn in Figma. Sits bottom-right on My trips and opens the chat.
class CopilotButton extends StatelessWidget {
  const CopilotButton({super.key, required this.onTap});

  final VoidCallback onTap;

  static const height = 46.0;
  static const cream = Color(0xFFE4E2D0);

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: 'Trip Copilot',
      child: Material(
        color: cream,
        elevation: 6,
        shadowColor: const Color(0x66000000),
        shape: const StadiumBorder(),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          key: const Key('chat-button'),
          onTap: onTap,
          child: SizedBox(
            height: height,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const CopilotMark(size: height),
                const SizedBox(width: 12),
                Padding(
                  padding: const EdgeInsets.only(right: 18),
                  child: Text(
                    'Trip Copilot',
                    style: TextStyle(
                      fontFamily: 'GoogleSansFlex',
                      fontSize: 16,
                      height: 1.2,
                      letterSpacing: -0.2,
                      color: AppColors.ink,
                      fontWeight: FontWeight.w500,
                      fontVariations: const [FontVariation('wght', 500)],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
