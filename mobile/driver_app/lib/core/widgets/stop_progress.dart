import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_text.dart';

enum StopProgressStyle {
  /// Segmented bar with a thumb (stop info screens).
  bar,

  /// Numbered circles joined by lines (arrived screen).
  stepper,
}

/// "2 of 4 stops completed" with an "All stops →" link and either the
/// segmented bar or the numbered stepper (Figma "progress-section").
class StopProgress extends StatelessWidget {
  const StopProgress({
    super.key,
    required this.completed,
    required this.total,
    required this.onAllStops,
    this.style = StopProgressStyle.bar,
  });

  final int completed;
  final int total;
  final VoidCallback onAllStops;
  final StopProgressStyle style;

  @override
  Widget build(BuildContext context) {
    final count = total < 0 ? 0 : total;
    final done = completed.clamp(0, count);

    return Container(
      color: AppColors.surface,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('$done of $count stops completed',
                  style: AppText.textSmRegular),
              InkWell(
                onTap: onAllStops,
                child: Row(
                  children: [
                    Text('All stops', style: AppText.textSmMedium),
                    const SizedBox(width: 4),
                    const Icon(Icons.arrow_forward_rounded,
                        size: 14, color: AppColors.ink),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          switch (style) {
            StopProgressStyle.bar => _Bar(
                fraction: count == 0 ? 0 : done / count,
                markers: count * 2,
                lit: done * 2,
              ),
            StopProgressStyle.stepper => _Stepper(total: count, done: done),
          },
        ],
      ),
    );
  }
}

class _Bar extends StatelessWidget {
  const _Bar({required this.fraction, required this.markers, required this.lit});

  final double fraction;
  final int markers;
  final int lit;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 16,
      child: LayoutBuilder(builder: (context, constraints) {
        final width = constraints.maxWidth;
        final fillWidth = width * fraction;
        return Stack(
          children: [
            Container(
              key: const Key('progress-track'),
              width: width,
              height: 16,
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(9999),
              ),
            ),
            Container(
              key: const Key('progress-fill'),
              width: fillWidth,
              height: 16,
              decoration: BoxDecoration(
                color: AppColors.lime500,
                borderRadius: BorderRadius.circular(9999),
              ),
            ),
            if (markers > 0)
              Positioned(
                left: 8,
                right: 9,
                top: 7,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    for (var i = 0; i < markers; i++)
                      Container(
                        key: ValueKey('progress-marker-$i'),
                        width: 2,
                        height: 2,
                        decoration: BoxDecoration(
                          color:
                              i < lit ? AppColors.surface : AppColors.inkFaint,
                          shape: BoxShape.circle,
                        ),
                      ),
                  ],
                ),
              ),
            if (fraction > 0)
              Positioned(
                left: (fillWidth - 14).clamp(2, width - 14),
                top: 2,
                child: Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    color: AppColors.lime200,
                    border: Border.all(color: AppColors.lime300),
                    shape: BoxShape.circle,
                  ),
                ),
              ),
          ],
        );
      }),
    );
  }
}

class _Stepper extends StatelessWidget {
  const _Stepper({required this.total, required this.done});

  final int total;
  final int done;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: Row(
        children: [
          for (var i = 0; i < total; i++) ...[
            if (i > 0)
              Expanded(
                child: Container(
                  height: 2,
                  color: i <= done ? AppColors.lime500 : AppColors.neutral300,
                ),
              ),
            _Dot(number: i + 1, state: _stateOf(i)),
          ],
        ],
      ),
    );
  }

  _DotState _stateOf(int index) {
    if (index < done) return _DotState.completed;
    if (index == done) return _DotState.current;
    return _DotState.upcoming;
  }
}

enum _DotState { completed, current, upcoming }

class _Dot extends StatelessWidget {
  const _Dot({required this.number, required this.state});

  final int number;
  final _DotState state;

  @override
  Widget build(BuildContext context) {
    final completed = state == _DotState.completed;
    final current = state == _DotState.current;
    return Container(
      width: 24,
      height: 24,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: completed ? AppColors.lime500 : AppColors.card,
        shape: BoxShape.circle,
        border: completed
            ? null
            : Border.all(
                color: current ? AppColors.lime500 : AppColors.neutral300,
                width: 2),
      ),
      child: Text(
        completed ? '✓' : '$number',
        style: TextStyle(
          fontFamily: 'Inter',
          fontSize: completed ? 14 : 12,
          fontWeight: completed || current ? FontWeight.w700 : FontWeight.w500,
          color: completed
              ? AppColors.card
              : current
                  ? AppColors.lime700
                  : AppColors.inkMuted,
        ),
      ),
    );
  }
}
