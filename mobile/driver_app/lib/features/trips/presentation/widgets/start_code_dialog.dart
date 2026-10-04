import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text.dart';

/// Asks for the six-digit start code the loader gives once the vehicle is
/// loaded. Pops with the code, or null if the driver cancels.
Future<String?> askStartCode(BuildContext context) => showDialog<String>(
  context: context,
  builder: (_) => const _StartCodeDialog(),
);

class _StartCodeDialog extends StatefulWidget {
  const _StartCodeDialog();

  @override
  State<_StartCodeDialog> createState() => _StartCodeDialogState();
}

class _StartCodeDialogState extends State<_StartCodeDialog> {
  final _code = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  void _submit() {
    final code = _code.text.trim();
    if (!RegExp(r'^\d{6}$').hasMatch(code)) {
      setState(() => _error = 'Enter the 6-digit start code');
      return;
    }
    Navigator.of(context).pop(code);
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: AppColors.card,
      title: Text('Start code', style: AppText.textLgSemibold),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'The loader gave you a 6-digit code when your vehicle was loaded. '
            'Enter it to leave the depot.',
            style: AppText.textSmRegular.copyWith(
              color: AppColors.inkSecondary,
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            key: const Key('start-code'),
            controller: _code,
            autofocus: true,
            keyboardType: TextInputType.number,
            maxLength: 6,
            textAlign: TextAlign.center,
            style: AppText.displayXs.copyWith(letterSpacing: 8),
            decoration: InputDecoration(
              counterText: '',
              hintText: '------',
              errorText: _error,
            ),
            onChanged: (_) => setState(() => _error = null),
            onSubmitted: (_) => _submit(),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        TextButton(
          key: const Key('start-code-submit'),
          onPressed: _submit,
          child: const Text('Start trip'),
        ),
      ],
    );
  }
}
