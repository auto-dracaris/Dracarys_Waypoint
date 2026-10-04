import 'package:driver_app/core/api/api_exception.dart';
import 'package:driver_app/core/api/token_store.dart';
import 'package:driver_app/features/auth/data/http_auth_repository.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/offline_harness.dart';

Map<String, dynamic> me({int id = 12, String first = 'Kasun'}) => {
  'id': id,
  'firstName': first,
  'lastName': 'Perera',
  'phone': '94771234567',
  'role': 'driver',
  'driver': {
    'code': 'DRV-00$id',
    'depot': 'Peliyagoda',
    'vehicle': {'id': 21, 'plate': 'VEH021', 'type': 'Refrigerated van'},
  },
};

void main() {
  HttpAuthRepository repoOn(OfflineHarness h, [TokenStore? tokens]) =>
      HttpAuthRepository(
        h.api,
        tokens ?? InMemoryTokenStore(access: 'A1', refresh: 'R1'),
        cache: h.cache,
      );

  test('opening the app with no signal keeps the driver signed in', () async {
    final h = OfflineHarness((_) => envelope(200, 'ok', me()));
    final repo = repoOn(h);
    expect((await repo.currentDriver())!.name, 'Kasun Perera');

    h.online = false; // the next launch has no signal
    final again = await repo.currentDriver();
    expect(again, isNotNull);
    expect(again!.code, 'DRV-0012');
    expect(again.vehicle!.plate, 'VEH021');
  });

  test(
    'with no signal and nothing saved yet, the failure is reported',
    () async {
      final h = OfflineHarness()..online = false;
      await expectLater(
        repoOn(h).currentDriver(),
        throwsA(
          isA<ApiException>().having((e) => e.isNetwork, 'network', true),
        ),
      );
    },
  );

  test('an expired session still signs out, cache or not', () async {
    final h = OfflineHarness((_) => envelope(200, 'ok', me()));
    final repo = repoOn(h);
    await repo.currentDriver();
    h.respond = (_) => envelope(401, 'Unauthorized');
    h.api.tokens.clear();
    expect(await repo.currentDriver(), isNull);
  });

  test('not signed in at all is null without any request', () async {
    final h = OfflineHarness();
    final repo = repoOn(h, InMemoryTokenStore());
    expect(await repo.currentDriver(), isNull);
    expect(h.sent, isEmpty);
  });

  test(
    'signing in as someone else wipes the last driver\'s saved data',
    () async {
      final h = OfflineHarness(
        (req) => req.url.path.endsWith('/login')
            ? envelope(200, 'ok', {
                'accessToken': 'a',
                'refreshToken': 'r',
                'user': me(id: 99, first: 'Nimal'),
              })
            : envelope(200, 'ok', me()),
      );
      final repo = repoOn(h);
      await repo.currentDriver(); // driver 12 now owns the cache
      await h.cache.putJson('trip:t1', {'secret': 'driver 12 trip'});
      await h.store.write('queue', '[{"driver":12}]');

      await repo.login(phone: '0771234567', password: 'Secret1!');

      expect(await h.cache.getJson('trip:t1'), isNull);
      expect(await h.store.read('queue'), isNull);
      expect(await h.cache.getJson('me'), isNotNull); // driver 99's own
    },
  );

  test(
    'signing in again as the same driver keeps their unsent queue',
    () async {
      final h = OfflineHarness(
        (req) => req.url.path.endsWith('/login')
            ? envelope(200, 'ok', {
                'accessToken': 'a',
                'refreshToken': 'r',
                'user': me(),
              })
            : envelope(200, 'ok', me()),
      );
      final repo = repoOn(h);
      await repo.currentDriver();
      await h.store.write('queue', '[{"unsent":true}]');

      await repo.logout();
      await repo.login(phone: '0771234567', password: 'Secret1!');

      expect(await h.store.read('queue'), '[{"unsent":true}]');
    },
  );
}
