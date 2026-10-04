import '../../../core/photos/photo_picker.dart';
import '../../auth/data/auth_repository.dart';
import '../../auth/domain/driver.dart';
import 'account_repository.dart';

class MockAccountRepository implements AccountRepository {
  MockAccountRepository({
    this.latency = const Duration(milliseconds: 400),
    this.password = 'Secret1!',
  });

  final Duration latency;

  /// The password the demo account currently has.
  String password;

  @override
  Future<Driver> updateProfile(
    Driver current, {
    String? firstName,
    String? lastName,
    String? phone,
    PickedPhoto? newAvatar,
    bool removeAvatar = false,
  }) async {
    await Future<void>.delayed(latency);
    final first = firstName ?? current.firstName;
    final last = lastName ?? current.lastName;
    return Driver(
      id: current.id,
      name: '$first $last'.trim(),
      firstName: first,
      lastName: last,
      phone: phone ?? current.phone,
      code: current.code,
      depot: current.depot,
      vehicle: current.vehicle,
      depotLat: current.depotLat,
      depotLng: current.depotLng,
      // There is no server to host the picture; keep what was there.
      avatarUrl: removeAvatar ? null : current.avatarUrl,
    );
  }

  @override
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    await Future<void>.delayed(latency);
    if (currentPassword != password) {
      throw const AuthException('Current password is incorrect');
    }
    password = newPassword;
  }
}
