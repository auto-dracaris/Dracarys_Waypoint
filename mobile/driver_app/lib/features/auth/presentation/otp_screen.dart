import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/widgets/primary_button.dart';
import '../data/auth_repository.dart';
import 'auth_controller.dart';
import 'auth_form_state.dart';
import 'auth_scaffold.dart';
import 'validators.dart';

class OtpScreen extends ConsumerStatefulWidget {
  const OtpScreen({super.key, required this.phone, required this.otpId});

  final String phone;
  final int otpId;

  @override
  AuthFormState<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends AuthFormState<OtpScreen> {
  final _otp = TextEditingController();

  @override
  void dispose() {
    _otp.dispose();
    super.dispose();
  }

  Future<void> _resend() async {
    try {
      await ref
          .read(authControllerProvider.notifier)
          .resendOtp(phone: widget.phone);
    } on AuthException catch (e) {
      if (mounted) setState(() => error = e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      title: 'Verify your phone',
      subtitle: 'Enter the 6-digit code sent to ${widget.phone}.',
      children: [
        Form(
          key: formKey,
          child: TextFormField(
            key: const Key('otp'),
            controller: _otp,
            keyboardType: TextInputType.number,
            maxLength: 6,
            decoration: const InputDecoration(labelText: 'Code'),
            validator: validateOtp,
          ),
        ),
        FormError(error),
        const SizedBox(height: 24),
        PrimaryButton(
          key: const Key('otp-submit'),
          label: 'Verify',
          isLoading: busy,
          onPressed: () => submit(() async {
            await ref.read(authControllerProvider.notifier).verifyOtp(
                phone: widget.phone,
                otp: _otp.text.trim(),
                otpId: widget.otpId);
            if (!context.mounted) return;
            context.go(Uri(path: '/login', queryParameters: {
              'message': 'Phone verified. Sign in to continue.'
            }).toString());
          }),
        ),
        const SizedBox(height: 12),
        TextButton(
          key: const Key('otp-resend'),
          onPressed: _resend,
          child: const Text('Resend code'),
        ),
      ],
    );
  }
}
