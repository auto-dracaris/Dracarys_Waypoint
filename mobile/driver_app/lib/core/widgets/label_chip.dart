import 'package:flutter/material.dart';

/// Small pill label (Figma "Label", size XS): 20 px tall, Inter Medium 10.
class LabelChip extends StatelessWidget {
  const LabelChip({
    super.key,
    required this.label,
    required this.background,
    required this.foreground,
    this.icon,
    this.large = false,
  });

  final String label;
  final Color background;
  final Color foreground;
  final IconData? icon;

  /// The 28 px "M" size used on the issue form (default is the 20 px "XS").
  final bool large;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: large ? 28 : 20,
      padding: EdgeInsets.symmetric(horizontal: large ? 12 : 8),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(large ? 14 : 10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: large ? 16 : 12, color: foreground),
            SizedBox(width: large ? 6 : 4),
          ],
          Text(
            label,
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: large ? 12 : 10,
              fontWeight: FontWeight.w500,
              color: foreground,
            ),
          ),
        ],
      ),
    );
  }
}
