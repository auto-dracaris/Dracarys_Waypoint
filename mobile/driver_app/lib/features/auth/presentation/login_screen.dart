import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/widgets/primary_button.dart';
import 'auth_controller.dart';
import 'auth_form_state.dart';
import 'auth_scaffold.dart';
import 'validators.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  AuthFormState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends AuthFormState<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      title: 'Sign in',
      subtitle: 'Welcome back, driver.',
      children: [
        Form(
          key: formKey,
          child: Column(
            children: [
              TextFormField(
                key: const Key('email'),
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(labelText: 'Email'),
                validator: validateEmail,
              ),
              const SizedBox(height: 16),
              TextFormField(
                key: const Key('password'),
                controller: _password,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Password'),
                validator: validatePassword,
              ),
            ],
          ),
        ),
        FormError(error),
        const SizedBox(height: 24),
        PrimaryButton(
          key: const Key('login-submit'),
          label: 'Sign in',
          isLoading: busy,
          onPressed: () => submit(() => ref
              .read(authControllerProvider.notifier)
              .login(email: _email.text.trim(), password: _password.text)),
        ),
        const SizedBox(height: 12),
        TextButton(
          key: const Key('go-signup'),
          onPressed: () => context.go('/signup'),
          child: const Text('Create account'),
        ),
      ],
    );
  }
}
