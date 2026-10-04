import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/photos/photo_picker.dart';
import '../../auth/presentation/auth_controller.dart';
import '../data/account_providers.dart';

/// Changes to the signed-in driver's own account. The new details replace the
/// signed-in driver, so every screen that shows the name or picture follows.
class AccountActions {
  AccountActions(this._ref);

  final Ref _ref;

  Future<void> updateProfile({
    String? firstName,
    String? lastName,
    String? phone,
    PickedPhoto? newAvatar,
    bool removeAvatar = false,
  }) async {
    final current = _ref.read(authControllerProvider).value;
    if (current == null) return;
    final updated = await _ref
        .read(accountRepositoryProvider)
        .updateProfile(
          current,
          firstName: firstName,
          lastName: lastName,
          phone: phone,
          newAvatar: newAvatar,
          removeAvatar: removeAvatar,
        );
    _ref.read(authControllerProvider.notifier).setDriver(updated);
  }

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) => _ref
      .read(accountRepositoryProvider)
      .changePassword(
        currentPassword: currentPassword,
        newPassword: newPassword,
      );
}

final accountActionsProvider = Provider<AccountActions>(AccountActions.new);
