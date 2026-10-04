import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/app_colors.dart';
import '../theme/app_text.dart';

/// A row of digit boxes over one hidden text field (Figma "Enter OTP"): tap the
/// boxes to type, and the digits fill them from the left. [controller] holds the
/// code, so callers read it the way they would any text field.
class OtpBoxes extends StatefulWidget {
  const OtpBoxes({
    super.key,
    required this.controller,
    this.length = 6,
    this.onChanged,
    this.error = false,
    this.fieldKey = const Key('otp-input'),
  });

  final TextEditingController controller;
  final int length;
  final ValueChanged<String>? onChanged;

  /// Outlines the boxes in red.
  final bool error;
  final Key fieldKey;

  @override
  State<OtpBoxes> createState() => _OtpBoxesState();
}

class _OtpBoxesState extends State<OtpBoxes> {
  final _focus = FocusNode();

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_rebuild);
    _focus.addListener(_rebuild);
  }

  @override
  void dispose() {
    widget.controller.removeListener(_rebuild);
    _focus.dispose();
    super.dispose();
  }

  void _rebuild() => setState(() {});

  @override
  Widget build(BuildContext context) {
    final digits = widget.controller.text;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: _focus.requestFocus,
      child: Stack(
        children: [
          Row(
            children: [
              for (var i = 0; i < widget.length; i++) ...[
                if (i > 0) const SizedBox(width: 8),
                Expanded(
                  child: _Box(
                    digit: i < digits.length ? digits[i] : null,
                    active: _focus.hasFocus && i == digits.length,
                    error: widget.error,
                  ),
                ),
              ],
            ],
          ),
          // The real field: invisible, but it owns the keyboard.
          Positioned.fill(
            child: Opacity(
              opacity: 0,
              child: TextField(
                key: widget.fieldKey,
                controller: widget.controller,
                focusNode: _focus,
                keyboardType: TextInputType.number,
                maxLength: widget.length,
                showCursor: false,
                enableInteractiveSelection: false,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                decoration: const InputDecoration(counterText: ''),
                onChanged: widget.onChanged,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Box extends StatelessWidget {
  const _Box({required this.digit, required this.active, required this.error});

  final String? digit;
  final bool active;
  final bool error;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 56,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          width: active || error ? 1.5 : 1,
          color: error
              ? AppColors.red700
              : active
              ? AppColors.brandYellow
              : AppColors.border,
        ),
      ),
      child: Text(
        digit ?? '0',
        style: AppText.displayXs.copyWith(
          color: digit == null ? AppColors.inkMuted : AppColors.ink,
        ),
      ),
    );
  }
}
