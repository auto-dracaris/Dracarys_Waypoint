import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/widgets/primary_button.dart';
import 'auth_controller.dart';
import 'auth_form_state.dart';
import 'auth_scaffold.dart';
import 'validators.dart';

class ResetPasswordScreen extends ConsumerStatefulWidget {
  const ResetPasswordScreen({super.key, required this.phone});

  final String phone;

  @override
  AuthFormState<ResetPasswordScreen> createState() =>
      _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends AuthFormState<ResetPasswordScreen> {
  final _otp = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();

  @override
  void dispose() {
    _otp.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      title: 'Reset password',
      subtitle:
          'Enter the code sent to ${widget.phone} and choose a new password.',
      children: [
        Form(
          key: formKey,
          child: Column(
            children: [
              TextFormField(
                key: const Key('reset-otp'),
                controller: _otp,
                keyboardType: TextInputType.number,
                maxLength: 6,
                decoration: const InputDecoration(labelText: 'Code'),
                validator: validateOtp,
              ),
              const SizedBox(height: 16),
              TextFormField(
                key: const Key('reset-password'),
                controller: _password,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'New password'),
                validator: validateNewPassword,
              ),
              const SizedBox(height: 16),
              TextFormField(
                key: const Key('reset-confirm'),
                controller: _confirm,
                obscureText: true,
                decoration:
                    const InputDecoration(labelText: 'Confirm new password'),
                validator: (v) => validateConfirm(v, _password.text),
              ),
            ],
          ),
        ),
        FormError(error),
        const SizedBox(height: 24),
        PrimaryButton(
          key: const Key('reset-submit'),
          label: 'Update password',
          isLoading: busy,
          onPressed: () => submit(() async {
            await ref.read(authControllerProvider.notifier).resetPassword(
                phone: widget.phone,
                otp: _otp.text.trim(),
                newPassword: _password.text);
            if (!context.mounted) return;
            context.go(Uri(path: '/login', queryParameters: {
              'message': 'Password updated. Sign in with your new password.'
            }).toString());
          }),
        ),
      ],
    );
  }
}
