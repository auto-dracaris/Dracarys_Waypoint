import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/error_message.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/back_bar.dart';
import '../../../core/widgets/labeled_field.dart';
import '../../auth/data/auth_repository.dart';
import '../../auth/presentation/validators.dart';
import '../application/account_actions.dart';

/// Change the signed-in driver's password. They stay signed in afterwards.
class ChangePasswordScreen extends ConsumerStatefulWidget {
  const ChangePasswordScreen({super.key});

  @override
  ConsumerState<ChangePasswordScreen> createState() =>
      _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends ConsumerState<ChangePasswordScreen> {
  final _current = TextEditingController();
  final _new = TextEditingController();
  final _confirm = TextEditingController();

  bool _submitted = false;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _current.dispose();
    _new.dispose();
    _confirm.dispose();
    super.dispose();
  }

  String? get _currentError => _submitted && _current.text.isEmpty
      ? 'Enter your current password'
      : null;
  String? get _newError => _submitted ? validatePassword(_new.text) : null;
  String? get _confirmError =>
      _submitted ? validateConfirm(_confirm.text, _new.text) : null;

  Future<void> _save() async {
    setState(() {
      _submitted = true;
      _error = null;
    });
    if (_currentError != null || _newError != null || _confirmError != null) {
      return;
    }

    setState(() => _busy = true);
    try {
      await ref
          .read(accountActionsProvider)
          .changePassword(
            currentPassword: _current.text,
            newPassword: _new.text,
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Password changed')));
      context.go('/account');
    } on AuthException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (e) {
      if (mounted) setState(() => _error = errorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          BackBar(label: 'Account', onBack: () => context.go('/account')),
          const Divider(height: 1, thickness: 1, color: AppColors.border),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text('Change password', style: AppText.displayXs),
                  const SizedBox(height: 4),
                  Text(
                    'You will stay signed in on this device.',
                    style: AppText.textSmRegular.copyWith(
                      color: AppColors.inkSecondary,
                    ),
                  ),
                  const SizedBox(height: 20),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      border: Border.all(color: AppColors.border),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        LabeledField(
                          label: 'Current password',
                          fieldKey: const Key('current-password'),
                          controller: _current,
                          obscureText: true,
                          errorText: _currentError,
                          onChanged: (_) => setState(() {}),
                        ),
                        const SizedBox(height: 16),
                        LabeledField(
                          label: 'New password',
                          caption: 'At least 6 characters',
                          fieldKey: const Key('new-password'),
                          controller: _new,
                          obscureText: true,
                          errorText: _newError,
                          onChanged: (_) => setState(() {}),
                        ),
                        const SizedBox(height: 16),
                        LabeledField(
                          label: 'Confirm new password',
                          fieldKey: const Key('confirm-password'),
                          controller: _confirm,
                          obscureText: true,
                          errorText: _confirmError,
                          onChanged: (_) => setState(() {}),
                        ),
                      ],
                    ),
                  ),
                  if (_error != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: Text(
                        _error!,
                        key: const Key('form-error'),
                        style: AppText.textSmRegular.copyWith(
                          color: AppColors.red700,
                        ),
                      ),
                    ),
                  const SizedBox(height: 20),
                  AppButton(
                    key: const Key('save-password'),
                    label: 'Change password',
                    bold: true,
                    padding: 14,
                    radius: 8,
                    isLoading: _busy,
                    onPressed: _save,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
