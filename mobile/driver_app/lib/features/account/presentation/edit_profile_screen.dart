import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/error_message.dart';
import '../../../core/photos/photo_picker.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/back_bar.dart';
import '../../../core/widgets/driver_avatar.dart';
import '../../../core/widgets/labeled_field.dart';
import '../../auth/data/auth_repository.dart';
import '../../auth/domain/driver.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../auth/presentation/validators.dart';
import '../application/account_actions.dart';

/// Edit the driver's own name, phone number and picture.
class EditProfileScreen extends ConsumerWidget {
  const EditProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final driver = ref.watch(authControllerProvider);
    return AsyncValueView(
      value: driver,
      onRetry: () => ref.invalidate(authControllerProvider),
      data: (d) =>
          d == null ? const SizedBox.shrink() : _EditProfileForm(driver: d),
    );
  }
}

class _EditProfileForm extends ConsumerStatefulWidget {
  const _EditProfileForm({required this.driver});

  final Driver driver;

  @override
  ConsumerState<_EditProfileForm> createState() => _EditProfileFormState();
}

class _EditProfileFormState extends ConsumerState<_EditProfileForm> {
  late final Driver _driver = widget.driver;
  late final TextEditingController _first;
  late final TextEditingController _last;
  late final TextEditingController _phone;

  PickedPhoto? _photo;
  bool _removePhoto = false;
  bool _submitted = false;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _first = TextEditingController(text: _driver.firstName);
    _last = TextEditingController(text: _driver.lastName);
    _phone = TextEditingController(text: _driver.phone);
  }

  @override
  void dispose() {
    _first.dispose();
    _last.dispose();
    _phone.dispose();
    super.dispose();
  }

  String? get _firstError => _submitted ? validateName(_first.text) : null;
  String? get _lastError => _submitted ? validateName(_last.text) : null;
  String? get _phoneError => _submitted ? validatePhone(_phone.text) : null;

  bool get _hasPicture =>
      _photo != null || (!_removePhoto && (_driver.avatarUrl ?? '').isNotEmpty);

  Future<void> _choosePhoto() async {
    final choice = await showModalBottomSheet<_PhotoChoice>(
      context: context,
      backgroundColor: AppColors.card,
      showDragHandle: true,
      builder: (_) => _PhotoSheet(canRemove: _hasPicture),
    );
    if (choice == null || !mounted) return;
    if (choice == _PhotoChoice.remove) {
      setState(() {
        _photo = null;
        _removePhoto = true;
      });
      return;
    }
    try {
      final photo = await ref
          .read(photoPickerProvider)
          .pick(
            choice == _PhotoChoice.camera
                ? PhotoSource.camera
                : PhotoSource.gallery,
          );
      if (photo != null && mounted) {
        setState(() {
          _photo = photo;
          _removePhoto = false;
        });
      }
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    }
  }

  Future<void> _save() async {
    setState(() {
      _submitted = true;
      _error = null;
    });
    if (_firstError != null || _lastError != null || _phoneError != null) {
      return;
    }

    final first = _first.text.trim(), last = _last.text.trim();
    final phone = _phone.text.trim();
    final nothingChanged =
        first == _driver.firstName &&
        last == _driver.lastName &&
        phone == _driver.phone &&
        _photo == null &&
        !_removePhoto;
    if (nothingChanged) {
      context.go('/account');
      return;
    }

    setState(() => _busy = true);
    try {
      await ref
          .read(accountActionsProvider)
          .updateProfile(
            firstName: first == _driver.firstName ? null : first,
            lastName: last == _driver.lastName ? null : last,
            phone: phone == _driver.phone ? null : phone,
            newAvatar: _photo,
            removeAvatar: _removePhoto,
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Profile updated')));
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
    final previewing = _photo != null;
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
                  Text('Edit profile', style: AppText.displayXs),
                  const SizedBox(height: 20),
                  Center(
                    child: DriverAvatar(
                      initials: _driver.initials,
                      url: _removePhoto ? null : _driver.avatarUrl,
                      bytes: previewing ? MemoryImage(_photo!.bytes) : null,
                      size: 96,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Center(
                    child: TextButton.icon(
                      key: const Key('change-photo'),
                      style: TextButton.styleFrom(
                          foregroundColor: AppColors.ink),
                      onPressed: _choosePhoto,
                      icon: const Icon(Icons.photo_camera_outlined, size: 18),
                      label: Text(_hasPicture ? 'Change photo' : 'Add photo'),
                    ),
                  ),
                  const SizedBox(height: 12),
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
                          label: 'First name',
                          fieldKey: const Key('first-name'),
                          controller: _first,
                          errorText: _firstError,
                          onChanged: (_) => setState(() {}),
                        ),
                        const SizedBox(height: 16),
                        LabeledField(
                          label: 'Last name',
                          fieldKey: const Key('last-name'),
                          controller: _last,
                          errorText: _lastError,
                          onChanged: (_) => setState(() {}),
                        ),
                        const SizedBox(height: 16),
                        LabeledField(
                          label: 'Phone number',
                          fieldKey: const Key('phone'),
                          controller: _phone,
                          keyboardType: TextInputType.phone,
                          errorText: _phoneError,
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
                    key: const Key('save-profile'),
                    label: 'Save changes',
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

enum _PhotoChoice { camera, gallery, remove }

class _PhotoSheet extends StatelessWidget {
  const _PhotoSheet({required this.canRemove});

  final bool canRemove;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(
            key: const Key('photo-camera'),
            leading: const Icon(Icons.photo_camera_outlined),
            title: const Text('Take a photo'),
            onTap: () => Navigator.of(context).pop(_PhotoChoice.camera),
          ),
          ListTile(
            key: const Key('photo-gallery'),
            leading: const Icon(Icons.photo_library_outlined),
            title: const Text('Choose from gallery'),
            onTap: () => Navigator.of(context).pop(_PhotoChoice.gallery),
          ),
          if (canRemove)
            ListTile(
              key: const Key('photo-remove-picture'),
              leading: const Icon(
                Icons.delete_outline,
                color: AppColors.red700,
              ),
              title: const Text(
                'Remove photo',
                style: TextStyle(color: AppColors.red700),
              ),
              onTap: () => Navigator.of(context).pop(_PhotoChoice.remove),
            ),
        ],
      ),
    );
  }
}
