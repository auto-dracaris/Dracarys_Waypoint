import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/widgets/primary_button.dart';
import 'auth_controller.dart';
import 'auth_form_state.dart';
import 'auth_scaffold.dart';
import 'validators.dart';

class SignUpScreen extends ConsumerStatefulWidget {
  const SignUpScreen({super.key});

  @override
  AuthFormState<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends AuthFormState<SignUpScreen> {
  final _firstName = TextEditingController();
  final _lastName = TextEditingController();
  final _phone = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();

  @override
  void dispose() {
    _firstName.dispose();
    _lastName.dispose();
    _phone.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      title: 'Create account',
      subtitle: 'Set up your driver profile.',
      children: [
        Form(
          key: formKey,
          child: Column(
            children: [
              TextFormField(
                key: const Key('firstName'),
                controller: _firstName,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(labelText: 'First name'),
                validator: validateName,
              ),
              const SizedBox(height: 16),
              TextFormField(
                key: const Key('lastName'),
                controller: _lastName,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(labelText: 'Last name'),
                validator: validateName,
              ),
              const SizedBox(height: 16),
              TextFormField(
                key: const Key('phone'),
                controller: _phone,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Phone number'),
                validator: validatePhone,
              ),
              const SizedBox(height: 16),
              TextFormField(
                key: const Key('password'),
                controller: _password,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Password'),
                validator: validateNewPassword,
              ),
              const SizedBox(height: 16),
              TextFormField(
                key: const Key('confirm'),
                controller: _confirm,
                obscureText: true,
                decoration:
                    const InputDecoration(labelText: 'Confirm password'),
                validator: (v) => validateConfirm(v, _password.text),
              ),
            ],
          ),
        ),
        FormError(error),
        const SizedBox(height: 24),
        PrimaryButton(
          key: const Key('signup-submit'),
          label: 'Create account',
          isLoading: busy,
          onPressed: () => submit(() => ref
              .read(authControllerProvider.notifier)
              .signUp(
                  firstName: _firstName.text.trim(),
                  lastName: _lastName.text.trim(),
                  phone: _phone.text.trim(),
                  password: _password.text)),
        ),
        const SizedBox(height: 12),
        TextButton(
          key: const Key('go-login'),
          onPressed: () => context.go('/login'),
          child: const Text('Sign in'),
        ),
      ],
    );
  }
}
