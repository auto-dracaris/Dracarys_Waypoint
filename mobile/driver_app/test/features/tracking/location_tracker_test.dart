import 'dart:async';
import 'dart:convert';

import 'package:driver_app/core/api/api_providers.dart';
import 'package:driver_app/core/connectivity/online_provider.dart';
import 'package:driver_app/core/demo_mode.dart';
import 'package:driver_app/core/storage/local_store.dart';
import 'package:driver_app/features/auth/data/auth_providers.dart';
import 'package:driver_app/features/auth/data/auth_repository.dart';
import 'package:driver_app/features/auth/domain/driver.dart';
import 'package:driver_app/features/auth/presentation/auth_controller.dart';
import 'package:driver_app/features/tracking/application/location_tracker.dart';
import 'package:driver_app/features/tracking/data/location_buffer.dart';
import 'package:driver_app/features/tracking/data/position_source.dart';
import 'package:driver_app/features/tracking/domain/location_point.dart';
import 'package:driver_app/features/trips/data/trips_providers.dart';
import 'package:driver_app/features/trips/domain/trip.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import '../../support/fixed_trips_repository.dart';
import '../../support/offline_harness.dart';

const driverWithVehicle = Driver(
  id: '12',
  name: 'Kasun Perera',
  code: 'DRV-0012',
  depot: 'Peliyagoda',
  vehicle: DriverVehicle(id: 21, plate: 'VEH021', type: 'Refrigerated van'),
);

const driverWithoutVehicle = Driver(
  id: '12',
  name: 'Kasun Perera',
  code: 'DRV-0012',
  depot: '',
);

class _SignedIn extends AuthController {
  _SignedIn(this.driver);

  final Driver driver;

  @override
  Future<Driver?> build() async => driver;
}

/// Answers `currentDriver` only: all the tracker asks of it.
class _AuthRepo implements AuthRepository {
  _AuthRepo(this.driver);

  Driver driver;
  int fetched = 0;

  @override
  Future<Driver?> currentDriver() async {
    fetched++;
    return driver;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => throw UnimplementedError();
}

class _FakeGps implements PositionSource {
  final controller = StreamController<GpsFix>.broadcast();
  int watched = 0;
  Object? failWith;

  @override
  Stream<GpsFix> watch() {
    watched++;
    if (failWith != null) {
      return Stream<GpsFix>.error(failWith!);
    }
    return controller.stream;
  }

  void emit(GpsFix fix) => controller.add(fix);
}

Trip trip(TripStatus status) => Trip(
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Trip 1',
  subtitle: '',
  departure: DateTime(2026, 10, 5),
  status: status,
  stops: const [],
);

final t0 = DateTime.utc(2026, 10, 5, 3, 0, 0);

GpsFix fix(
  int seconds, {
  double lat = 6.93,
  double? heading = 90,
  double? speed = 8.0,
  double? accuracy = 5,
}) => GpsFix(
  lat: lat,
  lng: 79.86,
  time: t0.add(Duration(seconds: seconds)),
  headingDegrees: heading,
  speedMps: speed,
  accuracyMeters: accuracy,
);

class Rig {
  Rig({
    this.driver = driverWithVehicle,
    TripStatus tripStatus = TripStatus.inProgress,
    bool demo = false,
    http.Response Function(http.Request)? respond,
  }) : tripStatus = tripStatus,
       h = OfflineHarness(respond ?? ((r) => _accepted(r))),
       authRepo = _AuthRepo(driver) {
    container = ProviderContainer(
      overrides: [
        localStoreProvider.overrideWithValue(h.store),
        apiClientProvider.overrideWithValue(h.api),
        authControllerProvider.overrideWith(() => _SignedIn(driver)),
        authRepositoryProvider.overrideWithValue(authRepo),
        tripsRepositoryProvider.overrideWithValue(
          FixedTripsRepository([trip(tripStatus)]),
        ),
        positionSourceProvider.overrideWithValue(gps),
        networkStatusProvider.overrideWithValue(network.stream),
        initialDemoModeProvider.overrideWithValue(demo),
      ],
    );
  }

  final TripStatus tripStatus;
  late final trips = FixedTripsRepository([trip(tripStatus)]);
  final Driver driver;
  final OfflineHarness h;
  final _AuthRepo authRepo;
  final gps = _FakeGps();
  final network = StreamController<bool>.broadcast();
  late final ProviderContainer container;
  DateTime now = t0.add(const Duration(seconds: 2));

  LocationTracker get tracker =>
      container.read(locationTrackerProvider.notifier);
  TrackerState get state => container.read(locationTrackerProvider);
  LocationBuffer get buffer => container.read(locationBufferProvider);

  Future<void> start() async {
    await container.read(authControllerProvider.future);
    container.read(locationTrackerProvider);
    tracker.clock = () => now;
    tracker.uploadEvery = Duration.zero; // each beat sends; see 'upload pace'
    await container.read(tripsProvider.future);
    await Future<void>.delayed(const Duration(milliseconds: 20));
  }

  /// A new GPS reading at [seconds] after t0, the clock at the same moment,
  /// and one beat of the tracker.
  Future<void> beat(int seconds, {GpsFix? reading}) async {
    now = t0.add(Duration(seconds: seconds));
    gps.emit(reading ?? fix(seconds));
    await Future<void>.delayed(Duration.zero);
    await tracker.tick();
  }

  void dispose() {
    container.dispose();
    network.close();
    gps.controller.close();
  }
}

http.Response _accepted(http.Request r) {
  if (r.url.path.endsWith('/locations')) {
    final n = (jsonDecode(r.body)['points'] as List).length;
    return envelope(202, 'Locations queued', {'received': n});
  }
  return envelope(200, 'ok');
}

List<http.Request> locationPosts(Rig r) =>
    r.h.posts.where((p) => p.url.path.endsWith('/locations')).toList();

List<String> ids(http.Request r) => [
  for (final p in (jsonDecode(r.body)['points'] as List))
    (p as Map)['clientId'] as String,
];

void main() {
  late Rig rig;
  tearDown(() => rig.dispose());

  group('upload pace', () {
    test(
      'records every beat but sends about once a minute, in one batch',
      () async {
        rig = Rig();
        await rig.start();
        rig.tracker.uploadEvery = LocationTracker.defaultUploadEvery;

        await rig.beat(1); // first beat goes out at once
        expect(locationPosts(rig), hasLength(1));

        for (var s = 2; s <= 30; s++) {
          await rig.beat(s);
        }
        expect(locationPosts(rig), hasLength(1)); // still waiting
        expect(await rig.buffer.count(), 29);

        await rig.beat(61);
        expect(locationPosts(rig), hasLength(2));
        expect(ids(locationPosts(rig).last), hasLength(30));
        expect(await rig.buffer.count(), 0);
      },
    );
  });

  group('recording', () {
    test(
      'records a point from the latest reading and sends it at once',
      () async {
        rig = Rig();
        await rig.start();
        expect(rig.state.tracking, isTrue);

        await rig.beat(5);

        final posts = locationPosts(rig);
        expect(posts, hasLength(1));
        expect(posts.single.url.path, '/api/vehicles/21/locations');
        final p =
            (jsonDecode(posts.single.body)['points'] as List).single as Map;
        expect(p['lat'], 6.93);
        expect(p['lng'], 79.86);
        expect(p['heading'], 90);
        expect(p['speedKmh'], closeTo(28.8, 0.001)); // 8 m/s
        expect(p['recordedAt'], '2026-10-05T03:00:05.000Z');
        expect(p['clientId'], matches(RegExp(r'^[0-9a-f-]{36}$')));
        // The server said 202: nothing left on the phone.
        expect(await rig.buffer.count(), 0);
        expect(rig.state.pending, 0);
      },
    );

    test('each beat records the newest reading, once', () async {
      rig = Rig();
      await rig.start();
      await rig.beat(5);
      await rig.beat(10);
      // No new reading arrived: a third beat records nothing new.
      rig.now = t0.add(const Duration(seconds: 12));
      await rig.tracker.tick();

      expect(locationPosts(rig), hasLength(2));
      final all = locationPosts(rig).expand(ids).toSet();
      expect(all, hasLength(2)); // two distinct points, two distinct ids
    });

    test('waits for the first reading before recording anything', () async {
      rig = Rig();
      await rig.start();
      await rig.tracker.tick();
      expect(rig.h.posts, isEmpty);
    });

    test('heading and speed the phone cannot give are left out', () async {
      rig = Rig();
      await rig.start();
      await rig.beat(5, reading: fix(5, heading: -1, speed: -1));
      final p =
          (jsonDecode(locationPosts(rig).single.body)['points'] as List).single
              as Map;
      expect(p.containsKey('heading'), isFalse);
      expect(p.containsKey('speedKmh'), isFalse);
    });

    test(
      'a reading with a heading of 360 is kept; one beyond is not',
      () async {
        rig = Rig();
        await rig.start();
        await rig.beat(5, reading: fix(5, heading: 360));
        await rig.beat(10, reading: fix(10, heading: 400));
        final pts = locationPosts(rig)
            .expand((r) => jsonDecode(r.body)['points'] as List)
            .cast<Map>()
            .toList();
        expect(pts[0]['heading'], 360);
        expect(pts[1].containsKey('heading'), isFalse);
      },
    );

    test(
      'a stale reading (the GPS stopped reporting) is not recorded',
      () async {
        rig = Rig();
        await rig.start();
        rig.gps.emit(fix(0));
        await Future<void>.delayed(Duration.zero);
        rig.now = t0.add(const Duration(seconds: 40)); // 40 s old
        await rig.tracker.tick();
        expect(rig.h.posts, isEmpty);
      },
    );

    test('a vague reading (a cell-tower guess) is not recorded', () async {
      rig = Rig();
      await rig.start();
      await rig.beat(5, reading: fix(5, accuracy: 900));
      expect(rig.h.posts, isEmpty);
      await rig.beat(10, reading: fix(10, accuracy: 25));
      expect(locationPosts(rig), hasLength(1));
    });
  });

  group('when to track', () {
    test('only while a trip is in progress', () async {
      for (final status in [
        TripStatus.assigned,
        TripStatus.loading,
        TripStatus.ready,
        TripStatus.completed,
      ]) {
        rig = Rig(tripStatus: status);
        await rig.start();
        expect(rig.state.tracking, isFalse, reason: '$status');
        expect(rig.gps.watched, 0, reason: '$status');
        await rig.beat(5);
        expect(rig.h.posts, isEmpty, reason: '$status');
        rig.dispose();
      }
      rig = Rig(); // for the tearDown
    });

    test('not without a vehicle', () async {
      rig = Rig(driver: driverWithoutVehicle);
      await rig.start();
      expect(rig.state.tracking, isFalse);
      await rig.beat(5);
      expect(rig.h.posts, isEmpty);
    });

    test('never in demo mode: nothing to send it to', () async {
      rig = Rig(demo: true);
      await rig.start();
      expect(rig.state.tracking, isFalse);
      await rig.beat(5);
      expect(rig.h.posts, isEmpty);
    });
  });

  group('with no signal', () {
    test('keeps recording on the phone and sends nothing', () async {
      rig = Rig();
      await rig.start();
      rig.h.online = false;
      rig.network.add(false);
      await Future<void>.delayed(const Duration(milliseconds: 20));

      for (final s in [5, 10, 15, 20]) {
        await rig.beat(s);
      }

      expect(await rig.buffer.count(), 4);
      expect(rig.state.pending, 4);
      expect(locationPosts(rig), isEmpty);
    });

    test(
      'sends the whole backlog, oldest first, when the signal returns',
      () async {
        rig = Rig();
        await rig.start();
        rig.h.online = false;
        rig.network.add(false);
        await Future<void>.delayed(const Duration(milliseconds: 20));
        for (final s in [5, 10, 15]) {
          await rig.beat(s);
        }
        final waiting = (await rig.buffer.oldest(10)).map((p) => p.id).toList();

        rig.h.online = true;
        rig.network.add(true);
        await Future<void>.delayed(const Duration(milliseconds: 50));

        final posts = locationPosts(rig);
        expect(posts, hasLength(1));
        expect(ids(posts.single), waiting); // oldest first, same ids
        expect(await rig.buffer.count(), 0);
        expect(rig.state.pending, 0);
      },
    );

    test('a long backlog goes in batches of 500, oldest first', () async {
      rig = Rig();
      await rig.start();
      for (var i = 0; i < 1200; i++) {
        await rig.buffer.add(
          LocationPoint(
            id: 'old-${i.toString().padLeft(4, '0')}',
            lat: 6.9,
            lng: 79.8,
            recordedAt: t0.subtract(Duration(minutes: 1200 - i)),
          ),
        );
      }
      await rig.tracker.flush(force: true);

      final posts = locationPosts(rig);
      expect(posts.map((p) => ids(p).length), [500, 500, 200]);
      final sentOrder = posts.expand(ids).toList();
      expect(sentOrder.first, 'old-0000');
      expect(sentOrder.last, 'old-1199');
      expect(sentOrder, [...sentOrder]..sort());
      expect(await rig.buffer.count(), 0);
    });
  });

  group('when the server does not take a batch', () {
    test(
      '503: keeps the points and sends the same batch again later',
      () async {
        var down = true;
        rig = Rig(
          respond: (r) => r.url.path.endsWith('/locations') && down
              ? envelope(503, 'Could not queue')
              : _accepted(r),
        );
        await rig.start();
        await rig.beat(5);

        expect(await rig.buffer.count(), 1);
        final firstId = ids(locationPosts(rig).single).single;

        // Inside the wait it does not hammer the server.
        await rig.beat(10);
        expect(locationPosts(rig), hasLength(1));

        down = false;
        rig.now = t0.add(const Duration(seconds: 25)); // past the 15 s wait
        rig.gps.emit(fix(25));
        await Future<void>.delayed(Duration.zero);
        await rig.tracker.tick();

        final last = ids(locationPosts(rig).last);
        expect(last, contains(firstId)); // the very same point, same id
        expect(await rig.buffer.count(), 0);
      },
    );

    test('a retry right away is allowed when the driver asks', () async {
      var down = true;
      rig = Rig(
        respond: (r) => r.url.path.endsWith('/locations') && down
            ? envelope(503, 'x')
            : _accepted(r),
      );
      await rig.start();
      await rig.beat(5);
      down = false;
      await rig.tracker.flush(force: true);
      expect(await rig.buffer.count(), 0);
    });

    test('403: keeps the points and fetches the profile again', () async {
      rig = Rig(
        respond: (r) => r.url.path.endsWith('/locations')
            ? envelope(403, 'Not the driver of this vehicle')
            : envelope(200, 'ok'),
      );
      await rig.start();
      await rig.beat(5);

      expect(await rig.buffer.count(), 1);
      await Future<void>.delayed(const Duration(milliseconds: 20));
      expect(rig.authRepo.fetched, 1);
    });

    test('404 is treated the same way', () async {
      rig = Rig(
        respond: (r) => r.url.path.endsWith('/locations')
            ? envelope(404, 'No active vehicle')
            : envelope(200, 'ok'),
      );
      await rig.start();
      await rig.beat(5);
      expect(await rig.buffer.count(), 1);
      await Future<void>.delayed(const Duration(milliseconds: 20));
      expect(rig.authRepo.fetched, 1);
    });

    test('400: the bad point is dropped, the others are not lost', () async {
      var poisonId = '';
      rig = Rig(
        respond: (r) {
          if (!r.url.path.endsWith('/locations')) return envelope(200, 'ok');
          final sent = ids(r);
          return poisonId.isNotEmpty && sent.contains(poisonId)
              ? envelope(400, 'lat must be a latitude')
              : _accepted(r);
        },
      );
      await rig.start();
      rig.h.online = false;
      rig.network.add(false);
      await Future<void>.delayed(const Duration(milliseconds: 20));
      for (final s in [5, 10, 15, 20]) {
        await rig.beat(s);
      }
      poisonId = (await rig.buffer.oldest(10))[1].id;

      rig.h.online = true;
      rig.network.add(true);
      await Future<void>.delayed(const Duration(milliseconds: 80));

      expect(await rig.buffer.count(), 0); // the bad one is gone, not stuck
      final accepted = locationPosts(rig)
          .where((r) => !ids(r).contains(poisonId))
          .expand(ids)
          .toSet();
      expect(accepted, hasLength(3));
    });
  });

  group('trip ends and the driver signs out', () {
    test(
      'points recorded earlier are still sent after the trip is over',
      () async {
        rig = Rig();
        await rig.start();
        rig.h.online = false;
        rig.network.add(false);
        await Future<void>.delayed(const Duration(milliseconds: 20));
        await rig.beat(5);
        await rig.beat(10);

        // The trip finishes while still offline.
        rig.container.read(tripsRepositoryProvider);
        rig.container.invalidate(tripsRepositoryProvider);

        rig.h.online = true;
        rig.network.add(true);
        await Future<void>.delayed(const Duration(milliseconds: 80));
        expect(await rig.buffer.count(), 0);
      },
    );
  });

  group('location problems', () {
    test(
      'location off or not allowed shows why, and nothing is recorded',
      () async {
        rig = Rig();
        rig.gps.failWith = const LocationUnavailable(
          'Location is switched off.',
        );
        await rig.start();
        await Future<void>.delayed(const Duration(milliseconds: 20));

        expect(rig.state.tracking, isFalse);
        expect(rig.state.problem, 'Location is switched off.');
        await rig.tracker.tick();
        expect(rig.h.posts, isEmpty);
      },
    );

    test(
      'tries again after a while, in case the driver fixed it in Settings',
      () async {
        rig = Rig();
        rig.gps.failWith = const LocationUnavailable(
          'Location is switched off.',
        );
        await rig.start();
        await Future<void>.delayed(const Duration(milliseconds: 20));
        expect(rig.gps.watched, 1);

        // Too soon.
        rig.now = t0.add(const Duration(seconds: 10));
        await rig.tracker.tick();
        expect(rig.gps.watched, 1);

        // The driver turns location on; after the wait the tracker looks again.
        rig.gps.failWith = null;
        rig.now = t0.add(const Duration(seconds: 40));
        await rig.tracker.tick();
        expect(rig.gps.watched, 2);
        expect(rig.state.tracking, isTrue);

        rig.gps.emit(fix(40));
        await Future<void>.delayed(Duration.zero);
        expect(rig.state.problem, isNull);
      },
    );

    test('any other failure gets a plain message', () async {
      rig = Rig();
      rig.gps.failWith = StateError('platform exploded');
      await rig.start();
      await Future<void>.delayed(const Duration(milliseconds: 20));
      expect(rig.state.problem, contains('could not get your location'));
    });
  });
}
