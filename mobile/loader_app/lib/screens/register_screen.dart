import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/auth_service.dart';

class RegisterScreen extends StatefulWidget {
  final AuthService? auth;
  const RegisterScreen({super.key, this.auth});
  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _form = GlobalKey<FormState>();
  final _first = TextEditingController();
  final _last = TextEditingController();
  final _phone = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  final _otp = TextEditingController();
  late final AuthService _auth = widget.auth ?? AuthService();
  int? _otpId;
  String? _registeredPhone;
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    for (final controller in [
      _first,
      _last,
      _phone,
      _password,
      _confirm,
      _otp,
    ]) {
      controller.dispose();
    }
    if (widget.auth == null) _auth.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_busy || !_form.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      if (_otpId == null) {
        final phone = AuthService.normalizePhone(_phone.text);
        final id = await _auth.register(
          firstName: _first.text,
          lastName: _last.text,
          phone: phone,
          password: _password.text,
        );
        if (!mounted) return;
        setState(() {
          _otpId = id;
          _registeredPhone = phone;
        });
        _password.clear();
        _confirm.clear();
      } else {
        await _auth.verifyPhone(
          phone: _registeredPhone!,
          otpId: _otpId!,
          otp: _otp.text,
        );
        if (mounted) Navigator.pop(context, _registeredPhone);
      }
    } catch (error) {
      if (mounted) {
        setState(
          () => _error = error is StateError
              ? error.message.toString()
              : 'Cannot reach the server. Please try again.',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _resend() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final id = await _auth.resendOtp(_registeredPhone!);
      if (!mounted) return;
      setState(() => _otpId = id);
      _otp.clear();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('A new verification code was sent.')),
      );
    } catch (error) {
      if (mounted) {
        setState(
          () => _error = error is StateError
              ? error.message.toString()
              : 'Could not resend the code. Try again.',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Widget _field(
    TextEditingController controller,
    String label, {
    bool secret = false,
    TextInputType? keyboard,
    String? Function(String?)? validator,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: TextFormField(
        controller: controller,
        obscureText: secret,
        enabled: !_busy,
        keyboardType: keyboard,
        textInputAction: TextInputAction.next,
        decoration: InputDecoration(
          labelText: label,
          border: const OutlineInputBorder(),
          filled: true,
          fillColor: Colors.white,
        ),
        validator:
            validator ??
            (value) => value == null || value.trim().isEmpty
                ? 'Enter your ${label.toLowerCase()}'
                : value.trim().length > 100
                ? 'Use at most 100 characters'
                : null,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final verifying = _otpId != null;
    return Scaffold(
      appBar: AppBar(
        title: Text(verifying ? 'Verify phone number' : 'Register'),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 450),
              child: Form(
                key: _form,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      verifying
                          ? 'Enter the six-digit code sent to $_registeredPhone.'
                          : 'Register and verify your phone number. A dispatcher must assign your loader role before you can sign in here.',
                      style: const TextStyle(fontSize: 18),
                    ),
                    const SizedBox(height: 24),
                    if (!verifying) ...[
                      _field(_first, 'First name'),
                      _field(_last, 'Last name'),
                      _field(
                        _phone,
                        'Phone number',
                        keyboard: TextInputType.phone,
                        validator: (value) =>
                            RegExp(
                              r'^\+[1-9]\d{7,14}$',
                            ).hasMatch(AuthService.normalizePhone(value ?? ''))
                            ? null
                            : 'Enter a valid phone number, e.g. 0771234567',
                      ),
                      _field(
                        _password,
                        'Password',
                        secret: true,
                        validator: (value) {
                          if (value == null || value.length < 6) {
                            return 'Use at least 6 characters';
                          }
                          if (!RegExp(r'[A-Z]').hasMatch(value) ||
                              !RegExp(
                                r'[!@#$%^&*(),.?":{}|<>]',
                              ).hasMatch(value)) {
                            return 'Include an uppercase letter and a special character';
                          }
                          return null;
                        },
                      ),
                      _field(
                        _confirm,
                        'Confirm password',
                        secret: true,
                        validator: (value) => value == _password.text
                            ? null
                            : 'Passwords do not match',
                      ),
                      const Text(
                        'After verification, a dispatcher must assign the loader role before you can use this app.',
                      ),
                      const SizedBox(height: 16),
                    ] else ...[
                      TextFormField(
                        key: const ValueKey('otp'),
                        controller: _otp,
                        enabled: !_busy,
                        keyboardType: TextInputType.number,
                        maxLength: 6,
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                        ],
                        decoration: const InputDecoration(
                          labelText: 'Verification code',
                          border: OutlineInputBorder(),
                        ),
                        validator: (value) =>
                            RegExp(r'^\d{6}$').hasMatch(value ?? '')
                            ? null
                            : 'Enter the six-digit code',
                        onFieldSubmitted: (_) => _submit(),
                      ),
                      const SizedBox(height: 16),
                    ],
                    if (_error != null) ...[
                      Text(
                        _error!,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.error,
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],
                    SizedBox(
                      height: 52,
                      child: ElevatedButton(
                        onPressed: _busy ? null : _submit,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFFACC15),
                          foregroundColor: Colors.black,
                        ),
                        child: _busy
                            ? const SizedBox(
                                width: 24,
                                height: 24,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : Text(
                                verifying ? 'Verify phone number' : 'Register',
                              ),
                      ),
                    ),
                    if (verifying)
                      TextButton(
                        onPressed: _busy ? null : _resend,
                        child: const Text('Resend code'),
                      ),
                    TextButton(
                      onPressed: _busy ? null : () => Navigator.pop(context),
                      child: const Text('Back to login'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
