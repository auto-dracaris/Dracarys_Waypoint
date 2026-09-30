import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_text.dart';

class Segment {
  const Segment({required this.label, required this.count});

  final String label;
  final int count;
}

/// Figma "Segmented control": grey track, the selected item is a white pill
/// with a soft shadow; each item shows a label and a count.
class SegmentedControl extends StatelessWidget {
  const SegmentedControl({
    super.key,
    required this.segments,
    required this.selectedIndex,
    required this.onChanged,
  });

  final List<Segment> segments;
  final int selectedIndex;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          for (var i = 0; i < segments.length; i++)
            Expanded(
              child: _SegmentItem(
                segment: segments[i],
                selected: i == selectedIndex,
                onTap: () => onChanged(i),
              ),
            ),
        ],
      ),
    );
  }
}

class _SegmentItem extends StatelessWidget {
  const _SegmentItem({
    required this.segment,
    required this.selected,
    required this.onTap,
  });

  final Segment segment;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? AppColors.surface : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          boxShadow: selected
              ? const [
                  BoxShadow(
                    color: Color(0x1A18181B),
                    offset: Offset(0, 1),
                    blurRadius: 1.5,
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              segment.label,
              style: selected
                  ? AppText.textSmMedium
                  : AppText.textSmRegular
                      .copyWith(color: AppColors.inkSecondary),
            ),
            const SizedBox(width: 6),
            Text('${segment.count}',
                style:
                    AppText.textSmRegular.copyWith(color: AppColors.inkFaint)),
          ],
        ),
      ),
    );
  }
}
