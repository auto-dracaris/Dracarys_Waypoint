import 'dart:convert';

import 'package:driver_app/core/api/api_client.dart';
import 'package:driver_app/core/api/token_store.dart';
import 'package:driver_app/core/photos/photo_picker.dart';
import 'package:driver_app/features/account/data/http_account_repository.dart';
import 'package:driver_app/features/auth/data/auth_repository.dart';
import 'package:driver_app/features/auth/data/http_auth_repository.dart';
import 'package:driver_app/features/auth/domain/driver.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

http.Response envelope(int status, String message, [Object? data]) =>
    http.Response(
      jsonEncode({'statusCode': status, 'message': message, 'data': data}),
      status,
      headers: {'content-type': 'application/json'},
    );

/// `AuthService.toProfile` for a driver.
Map<String, Object?> profileJson({
  String first = 'Kasun',
  String? avatar,
  bool withLocation = true,
}) => {
  'id': 12,
  'firstName': first,
  'lastName': 'Perera',
  'phone': '94771234567',
  'role': 'driver',
  'status': 'active',
  'avatar': avatar,
  'driver': {
    'code': 'DRV-0012',
    'depot': 'Peliyagoda',
    'depotLocation': withLocation ? {'lat': 6.9645, 'lng': '79.888'} : null,
    'vehicle': {'id': 21, 'plate': 'VEH021', 'type': 'Refrigerated van'},
  },
};

const current = Driver(
  id: '12',
  name: 'Kasun Perera',
  firstName: 'Kasun',
  lastName: 'Perera',
  phone: '94771234567',
  code: 'DRV-0012',
  depot: 'Peliyagoda',
);

({HttpAccountRepository repo, List<http.Request> sent}) build(
  http.Response Function(http.Request) respond,
) {
  final sent = <http.Request>[];
  final api = ApiClient(
    baseUrl: 'http://api.test/api',
    tokens: InMemoryTokenStore(access: 'A1', refresh: 'R1'),
    client: MockClient((req) async {
      sent.add(req);
      return respond(req);
    }),
  );
  return (repo: HttpAccountRepository(api), sent: sent);
}

void main() {
  test('driverFromJson reads phone, picture and depot location', () {
    final d = driverFromJson(profileJson(avatar: 'https://img/me.jpg'));
    expect(d.firstName, 'Kasun');
    expect(d.lastName, 'Perera');
    expect(d.phone, '94771234567');
    expect(d.avatarUrl, 'https://img/me.jpg');
    expect(d.depotLat, 6.9645);
    expect(d.depotLng, 79.888); // decimals may arrive as strings
  });

  test('no picture and no location are null', () {
    final json = profileJson(withLocation: false);
    final d = driverFromJson(json);
    expect(d.avatarUrl, isNull);
    expect(d.depotLat, isNull);
  });

  test('updateProfile PUTs only the fields given and maps the reply', () async {
    final t = build((_) => envelope(200, 'ok', profileJson(first: 'Nimal')));
    final updated = await t.repo.updateProfile(current, firstName: 'Nimal');

    expect(updated.name, 'Nimal Perera');
    final req = t.sent.single;
    expect(req.method, 'PUT');
    expect(req.url.path, '/api/auth/me');
    expect(jsonDecode(req.body), {'firstName': 'Nimal'});
  });

  test('a new picture is uploaded as an avatar, then named by id', () async {
    final t = build(
      (req) => req.url.path.endsWith('/images')
          ? envelope(201, 'ok', {'id': 'img-1', 'url': 'https://img/a.jpg'})
          : envelope(200, 'ok', profileJson(avatar: 'https://img/a.jpg')),
    );
    final updated = await t.repo.updateProfile(
      current,
      newAvatar: PickedPhoto(
        bytes: utf8.encode('jpg'),
        filename: 'me.jpg',
        contentType: 'image/jpeg',
      ),
    );

    expect(t.sent.first.url.path, '/api/images');
    expect(t.sent.first.body, contains('avatar'));
    expect(jsonDecode(t.sent.last.body), {'avatarImageId': 'img-1'});
    expect(updated.avatarUrl, 'https://img/a.jpg');
  });

  test('removing the picture sends an explicit null', () async {
    final t = build((_) => envelope(200, 'ok', profileJson()));
    await t.repo.updateProfile(current, removeAvatar: true);
    final body = jsonDecode(t.sent.single.body) as Map<String, dynamic>;
    expect(body.containsKey('avatarImageId'), isTrue);
    expect(body['avatarImageId'], isNull);
  });

  test('leaving the picture alone sends no avatarImageId', () async {
    final t = build((_) => envelope(200, 'ok', profileJson()));
    await t.repo.updateProfile(current, phone: '94770000000');
    final body = jsonDecode(t.sent.single.body) as Map<String, dynamic>;
    expect(body.containsKey('avatarImageId'), isFalse);
  });

  test('an API refusal becomes an AuthException with its message', () async {
    final t = build((_) => envelope(409, 'Phone number is already in use'));
    await expectLater(
      t.repo.updateProfile(current, phone: '94770000000'),
      throwsA(
        isA<AuthException>().having(
          (e) => e.message,
          'message',
          'Phone number is already in use',
        ),
      ),
    );
  });

  test('changePassword PUTs both passwords', () async {
    final t = build((_) => envelope(200, 'Password changed successfully'));
    await t.repo.changePassword(
      currentPassword: 'old-pass',
      newPassword: 'New-pass1!',
    );
    final req = t.sent.single;
    expect(req.method, 'PUT');
    expect(req.url.path, '/api/auth/change-password');
    expect(jsonDecode(req.body), {
      'currentPassword': 'old-pass',
      'newPassword': 'New-pass1!',
    });
  });

  test('a wrong current password is reported as the API words it', () async {
    final t = build((_) => envelope(400, 'Current password is incorrect'));
    await expectLater(
      t.repo.changePassword(currentPassword: 'x', newPassword: 'New-pass1!'),
      throwsA(
        isA<AuthException>().having(
          (e) => e.message,
          'message',
          'Current password is incorrect',
        ),
      ),
    );
  });
}
