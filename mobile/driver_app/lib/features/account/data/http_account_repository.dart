import '../../../core/api/api_client.dart';
import '../../../core/api/api_exception.dart';
import '../../../core/photos/photo_picker.dart';
import '../../../core/uuid.dart';
import '../../auth/data/auth_repository.dart';
import '../../auth/data/http_auth_repository.dart';
import '../../auth/domain/driver.dart';
import 'account_repository.dart';

class HttpAccountRepository implements AccountRepository {
  HttpAccountRepository(this._api);

  final ApiClient _api;

  Future<T> _guard<T>(Future<T> Function() run) async {
    try {
      return await run();
    } on ApiException catch (e) {
      throw AuthException(e.message);
    }
  }

  @override
  Future<Driver> updateProfile(
    Driver current, {
    String? firstName,
    String? lastName,
    String? phone,
    PickedPhoto? newAvatar,
    bool removeAvatar = false,
  }) => _guard(() async {
    // The picture goes up first (`POST /images`); the profile then names it.
    String? avatarId;
    if (newAvatar != null) {
      final image = await _api.upload(
        '/images',
        file: Upload(
          field: 'image',
          bytes: newAvatar.bytes,
          filename: newAvatar.filename,
          contentType: newAvatar.contentType,
        ),
        fields: {'purpose': 'avatar', 'clientId': newUuid()},
      ) as Map<String, dynamic>;
      avatarId = image['id'] as String;
    }
    final body = <String, Object?>{
      'firstName': ?firstName,
      'lastName': ?lastName,
      'phone': ?phone,
    };
    // Absent leaves the picture alone, null removes it, an id replaces it.
    if (avatarId != null) {
      body['avatarImageId'] = avatarId;
    } else if (removeAvatar) {
      body['avatarImageId'] = null;
    }
    final data = await _api.put('/auth/me', body: body) as Map<String, dynamic>;
    return driverFromJson(data);
  });

  @override
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) => _guard(
    () => _api.put(
      '/auth/change-password',
      body: {'currentPassword': currentPassword, 'newPassword': newPassword},
    ),
  );
}
