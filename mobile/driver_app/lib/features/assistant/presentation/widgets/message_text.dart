import 'package:flutter/material.dart';

import '../../../../core/theme/app_text.dart';

/// Renders the little markdown the assistant uses: `**bold**`, `*italic*`,
/// and `- ` bullet lines. Anything else is shown as typed, so a model that
/// writes plain text looks right too.
class MessageText extends StatelessWidget {
  const MessageText(this.text, {super.key, this.color});

  final String text;
  final Color? color;

  static final _inline = RegExp(r'\*\*(.+?)\*\*|\*(.+?)\*');
  static final _bullet = RegExp(r'^\s*[-•*]\s+(.*)$');

  TextStyle get _base => AppText.textMdMedium.copyWith(
    fontWeight: FontWeight.w400,
    fontVariations: const [FontVariation('wght', 400)],
    color: color,
  );

  List<InlineSpan> _spans(String line) {
    final spans = <InlineSpan>[];
    var at = 0;
    for (final m in _inline.allMatches(line)) {
      if (m.start > at) spans.add(TextSpan(text: line.substring(at, m.start)));
      final bold = m.group(1);
      spans.add(
        TextSpan(
          text: bold ?? m.group(2),
          style: bold != null
              ? const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontVariations: [FontVariation('wght', 700)],
                )
              : const TextStyle(fontStyle: FontStyle.italic),
        ),
      );
      at = m.end;
    }
    if (at < line.length) spans.add(TextSpan(text: line.substring(at)));
    return spans;
  }

  @override
  Widget build(BuildContext context) {
    final lines = text.trim().split('\n');
    final children = <Widget>[];
    for (final raw in lines) {
      if (raw.trim().isEmpty) {
        children.add(const SizedBox(height: 6));
        continue;
      }
      final bullet = _bullet.firstMatch(raw);
      if (bullet != null) {
        children.add(
          Padding(
            padding: const EdgeInsets.only(top: 2, left: 2),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.only(top: 9, right: 8),
                  child: Container(
                    width: 5,
                    height: 5,
                    decoration: BoxDecoration(
                      color: color ?? _base.color,
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
                Expanded(
                  child: Text.rich(
                    TextSpan(children: _spans(bullet.group(1)!)),
                    style: _base,
                  ),
                ),
              ],
            ),
          ),
        );
      } else {
        children.add(Text.rich(TextSpan(children: _spans(raw)), style: _base));
      }
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: children,
    );
  }
}
