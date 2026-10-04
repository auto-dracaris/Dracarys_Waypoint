import '../../../core/photos/photo_picker.dart';
import '../../auth/domain/driver.dart';

/// What the driver can change about their own account. Failures throw
/// `AuthException` with a message fit to show on the form.
abstract interface class AccountRepository {
  /// Saves the changed fields and returns the updated driver. Fields left null
  /// are untouched. [newAvatar] replaces the picture; [removeAvatar] clears it.
  /// [current] is the driver being edited.
  Future<Driver> updateProfile(
    Driver current, {
    String? firstName,
    String? lastName,
    String? phone,
    PickedPhoto? newAvatar,
    bool removeAvatar = false,
  });

  /// The driver stays signed in afterwards.
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  });
}
