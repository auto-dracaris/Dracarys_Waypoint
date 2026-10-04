import 'dart:async';
import 'dart:convert';

import 'package:driver_app/core/connectivity/online_provider.dart';
import 'package:driver_app/features/auth/data/auth_providers.dart';
import 'package:driver_app/features/auth/data/mock_auth_repository.dart';
import 'package:driver_app/features/auth/domain/driver.dart';
import 'package:driver_app/features/auth/presentation/auth_controller.dart';
import 'package:driver_app/features/sync/application/sync_service.dart';
import 'package:driver_app/features/sync/data/action_queue.dart';
import 'package:driver_app/features/sync/data/action_submitter.dart';
import 'package:driver_app/features/sync/data/sync_providers.dart';
import 'package:driver_app/features/sync/domain/pending_action.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import '../../support/offline_harness.dart';

const tripId = '11111111-1111-4111-8111-111111111111';

class _SignedIn extends AuthController {
  @override
  Future<Driver?> build() async => MockAuthRepository.demoDriver;
}

Map<String, Object?> arriveBody() => {
  'clientId': '00000000-0000-4000-8000-000000000001',
  'planVersion': 2,
  'arrivedAt': '2026-10-04T02:12:00.000Z',
};

Map<String, Object?> completeBody() => {
  'clientId': '00000000-0000-4000-8000-000000000002',
  'planVersion': 2,
  'completedAt': '2026-10-04T02:30:00.000Z',
  'deliveredCases': {'ORD0000012': 12},
  'deliveryCode': '123456',
};

void main() {
  group('ActionSubmitter', () {
    test('with a connection the action is sent straight away', () async {
      final h = OfflineHarness();
      final out = await h.submitter.submit(
        kind: ActionKind.arrive,
        tripId: tripId,
        stopId: '41',
        body: arriveBody(),
      );

      expect(out, SubmitOutcome.sent);
      expect(h.posts.single.url.path, '/api/trips/$tripId/stops/41/arrive');
      expect(jsonDecode(h.posts.single.body), arriveBody());
      expect(await h.queue.all(), isEmpty);
    });

    test(
      'with no connection it is queued, not lost, and the app is told',
      () async {
        final h = OfflineHarness()..online = false;
        final out = await h.submitter.submit(
          kind: ActionKind.arrive,
          tripId: tripId,
          stopId: '41',
          body: arriveBody(),
          meta: {'stopName': 'Fresh'},
        );

        expect(out, SubmitOutcome.queued);
        expect(h.sent, isEmpty); // not even attempted
        expect(h.queuedCount, 1);
        final saved = (await h.queue.all()).single;
        expect(saved.kind, ActionKind.arrive);
        expect(saved.stopId, '41');
        expect(saved.meta['stopName'], 'Fresh');
        expect(saved.body, arriveBody());
      },
    );

    test('a signal that drops mid-send queues it with its photo', () async {
      final h = OfflineHarness();
      // The phone believes it is online, but the request dies on the network.
      h.online = true;
      h.respond = (_) => throw http.ClientException('dropped');
      final out = await h.submitter.submit(
        kind: ActionKind.issue,
        tripId: tripId,
        body: {'clientId': 'c', 'type': 'damaged'},
        blobs: {
          'photo': const BlobData(
            bytes: [1, 2, 3],
            filename: 'p.jpg',
            contentType: 'image/jpeg',
          ),
        },
      );

      expect(out, SubmitOutcome.queued);
      final saved = (await h.queue.all()).single;
      expect(await h.store.readBytes(saved.blobs['photo']!.name), [1, 2, 3]);
      expect(h.reachability, contains(false));
    });

    test('a refusal reaches the caller and nothing is queued', () async {
      final h = OfflineHarness(
        (_) => envelope(409, 'The stop order has changed'),
      );
      await expectLater(
        h.submitter.submit(
          kind: ActionKind.complete,
          tripId: tripId,
          stopId: '41',
          body: completeBody(),
        ),
        throwsA(predicate((e) => e.toString().contains('stop order'))),
      );
      expect(await h.queue.all(), isEmpty);
    });

    test('a refused action leaves no photo behind', () async {
      final h = OfflineHarness((_) => envelope(400, 'Bad'));
      await expectLater(
        h.submitter.submit(
          kind: ActionKind.issue,
          tripId: tripId,
          body: {'clientId': 'c'},
          blobs: {
            'photo': const BlobData(
              bytes: [1],
              filename: 'p.jpg',
              contentType: 'image/jpeg',
            ),
          },
        ),
        throwsA(anything),
      );
      expect(h.store.blobCount, 0);
    });

    test(
      'later actions never overtake queued ones, even when back online',
      () async {
        final h = OfflineHarness()..online = false;
        await h.submitter.submit(
          kind: ActionKind.arrive,
          tripId: tripId,
          stopId: '41',
          body: arriveBody(),
        );

        h.online = true; // signal is back, but the arrival is still waiting
        final out = await h.submitter.submit(
          kind: ActionKind.complete,
          tripId: tripId,
          stopId: '41',
          body: completeBody(),
        );

        expect(out, SubmitOutcome.queued);
        expect(h.sent, isEmpty);
        expect((await h.queue.all()).map((a) => a.kind), [
          ActionKind.arrive,
          ActionKind.complete,
        ]);
      },
    );

    test('another trip is not held up by this one', () async {
      final h = OfflineHarness()..online = false;
      await h.submitter.submit(
        kind: ActionKind.arrive,
        tripId: tripId,
        stopId: '41',
        body: arriveBody(),
      );
      h.online = true;
      final out = await h.submitter.submit(
        kind: ActionKind.arrive,
        tripId: 'other-trip',
        stopId: '7',
        body: arriveBody(),
      );
      expect(out, SubmitOutcome.sent);
    });
  });

  group('ActionQueue', () {
    test(
      'keeps order, survives a restart, and removal deletes the photos',
      () async {
        final h = OfflineHarness()..online = false;
        await h.submitter.submit(
          kind: ActionKind.arrive,
          tripId: tripId,
          stopId: '41',
          body: arriveBody(),
        );
        await h.submitter.submit(
          kind: ActionKind.proof,
          tripId: tripId,
          stopId: '41',
          body: {
            'ids': {'proof': 'p', 'signature': 's', 'photo': 'f'},
            'receivedBy': 'Kumara',
          },
          blobs: {
            'signature': const BlobData(
              bytes: [7, 7],
              filename: 'signature.png',
              contentType: 'image/png',
            ),
          },
        );

        // A new queue over the same storage is the app after a restart.
        final reopened = ActionQueue(h.store);
        final items = await reopened.all();
        expect(items.map((a) => a.kind), [ActionKind.arrive, ActionKind.proof]);
        expect(h.store.blobCount, 1);

        await reopened.remove(items.last.id);
        expect(h.store.blobCount, 0);
        expect((await reopened.all()).single.kind, ActionKind.arrive);
      },
    );

    test('an unreadable queue file starts empty instead of crashing', () async {
      final h = OfflineHarness();
      await h.store.write('queue', '<<<garbage');
      expect(await h.queue.all(), isEmpty);
    });
  });

  group('SyncService', () {
    late OfflineHarness h;
    late StreamController<bool> network;
    late ProviderContainer container;

    setUp(() async {
      h = OfflineHarness()..online = false;
      network = StreamController<bool>();
      container = ProviderContainer(
        overrides: [
          actionQueueProvider.overrideWithValue(h.queue),
          actionExecutorProvider.overrideWithValue(h.executor),
          authControllerProvider.overrideWith(_SignedIn.new),
          authRepositoryProvider.overrideWithValue(
            MockAuthRepository(latency: Duration.zero),
          ),
          networkStatusProvider.overrideWithValue(network.stream),
        ],
      );
      addTearDown(() {
        container.dispose();
        network.close();
      });
      await container.read(authControllerProvider.future);
    });

    Future<void> queueSteps() async {
      await h.submitter.submit(
        kind: ActionKind.arrive,
        tripId: tripId,
        stopId: '41',
        body: arriveBody(),
      );
      await h.submitter.submit(
        kind: ActionKind.complete,
        tripId: tripId,
        stopId: '41',
        body: completeBody(),
      );
    }

    Future<void> settle() =>
        Future<void>.delayed(const Duration(milliseconds: 30));

    test('reports what is waiting', () async {
      await queueSteps();
      container.read(syncServiceProvider);
      await settle();
      final state = container.read(syncServiceProvider);
      expect(state.pending, hasLength(2));
      expect(state.rejected, isEmpty);
      expect(state.hasWork, isTrue);
    });

    test('sends everything in order once the connection is back', () async {
      await queueSteps();
      container.read(syncServiceProvider);
      await settle();

      h.online = true;
      await container.read(syncServiceProvider.notifier).sync();

      expect(h.posts.map((r) => r.url.path), [
        '/api/trips/$tripId/stops/41/arrive',
        '/api/trips/$tripId/stops/41/complete',
      ]);
      expect(await h.queue.all(), isEmpty);
      expect(container.read(syncServiceProvider).isEmpty, isTrue);
    });

    test('coming back online starts a sync by itself', () async {
      await queueSteps();
      container.read(syncServiceProvider);
      container.read(onlineProvider);
      network.add(false);
      await settle();
      expect(container.read(onlineProvider), isFalse);

      h.online = true;
      network.add(true);
      await settle();
      await settle();

      expect(h.posts, hasLength(2));
      expect(await h.queue.all(), isEmpty);
    });

    test(
      'with no connection yet it sends nothing and keeps everything',
      () async {
        await queueSteps();
        container.read(syncServiceProvider);
        await container.read(syncServiceProvider.notifier).sync();

        expect(await h.queue.all(), hasLength(2));
        final items = await h.queue.all();
        expect(items.every((a) => a.isPending), isTrue);
        expect(items.first.attempts, 1); // tried once, stopped at the first
      },
    );

    test(
      'a server error pauses the queue without rejecting anything',
      () async {
        await queueSteps();
        h.online = true;
        h.respond = (_) => envelope(503, 'Busy');
        container.read(syncServiceProvider);
        await container.read(syncServiceProvider.notifier).sync();

        expect(h.posts, hasLength(1)); // stopped at the first
        expect((await h.queue.all()).every((a) => a.isPending), isTrue);
      },
    );

    test('a refused step is kept with the reason and the steps that depend on '
        'it are not sent', () async {
      await queueSteps();
      h.online = true;
      h.respond = (r) => r.url.path.endsWith('/arrive')
          ? envelope(
              409,
              'The stop order has changed. Review the route update first',
            )
          : envelope(200, 'ok');
      container.read(syncServiceProvider);
      await container.read(syncServiceProvider.notifier).sync();

      expect(h.posts, hasLength(1)); // the completion was never attempted
      final state = container.read(syncServiceProvider);
      expect(state.pending, isEmpty);
      expect(state.rejected, hasLength(2));
      expect(state.rejected.first.error, contains('stop order has changed'));
      expect(state.rejected.last.error, contains('earlier step'));
    });

    test('a refusal does not block an unrelated action', () async {
      await h.submitter.submit(
        kind: ActionKind.arrive,
        tripId: tripId,
        stopId: '41',
        body: arriveBody(),
      );
      await h.submitter.submit(
        kind: ActionKind.issue,
        tripId: tripId,
        body: {
          'clientId': 'c',
          'type': 'damaged',
          'orderId': 'ORD0000012',
          'affectedCases': 1,
          'photoId': 'x',
        },
      );
      h.online = true;
      h.respond = (r) => r.url.path.endsWith('/arrive')
          ? envelope(403, 'This trip is not assigned to you')
          : envelope(201, 'ok');
      container.read(syncServiceProvider);
      await container.read(syncServiceProvider.notifier).sync();

      expect(h.posts.map((r) => r.url.path), contains('/api/issues'));
      expect(container.read(syncServiceProvider).rejected, hasLength(1));
    });

    test('a refused action can be dismissed', () async {
      await queueSteps();
      h.online = true;
      h.respond = (_) => envelope(400, 'No');
      container.read(syncServiceProvider);
      await container.read(syncServiceProvider.notifier).sync();
      final id = container.read(syncServiceProvider).rejected.first.id;

      await container.read(syncServiceProvider.notifier).dismiss(id);
      await settle();
      expect(container.read(syncServiceProvider).rejected, hasLength(1));
    });

    test('a lost photo is a refusal, not a crash', () async {
      await h.submitter.submit(
        kind: ActionKind.issue,
        tripId: tripId,
        body: {'clientId': 'c', 'type': 'damaged', 'photoId': 'x'},
        blobs: {
          'photo': const BlobData(
            bytes: [1],
            filename: 'p.jpg',
            contentType: 'image/jpeg',
          ),
        },
      );
      final saved = (await h.queue.all()).single;
      await h.store.deleteBytes(saved.blobs['photo']!.name);
      h.online = true;
      container.read(syncServiceProvider);
      await container.read(syncServiceProvider.notifier).sync();

      final rejected = container.read(syncServiceProvider).rejected.single;
      expect(rejected.error, contains('could not be found'));
    });

    test('proof uploads its signature then names it, in one action', () async {
      var n = 0;
      h.respond = (r) => r.url.path.endsWith('/images')
          ? envelope(201, 'ok', {'id': 'img-${++n}'})
          : envelope(201, 'ok');
      await h.submitter.submit(
        kind: ActionKind.proof,
        tripId: tripId,
        stopId: '41',
        body: {
          'ids': {'proof': 'P', 'signature': 'S', 'photo': 'F'},
          'receivedBy': 'Kumara',
          'notes': 'at the dock',
        },
        blobs: {
          'signature': const BlobData(
            bytes: [5],
            filename: 'signature.png',
            contentType: 'image/png',
          ),
        },
      );
      h.online = true;
      container.read(syncServiceProvider);
      await container.read(syncServiceProvider.notifier).sync();

      expect(h.posts.map((r) => r.url.path), [
        '/api/images',
        '/api/trips/$tripId/stops/41/proof',
      ]);
      final body = jsonDecode(h.posts.last.body) as Map<String, dynamic>;
      expect(body['clientId'], 'P');
      expect(body['signatureImageId'], 'img-1');
      expect(h.store.blobCount, 0);
    });

    test('nothing is sent while nobody is signed in', () async {
      await queueSteps();
      h.online = true;
      final signedOut = ProviderContainer(
        overrides: [
          actionQueueProvider.overrideWithValue(h.queue),
          actionExecutorProvider.overrideWithValue(h.executor),
          authRepositoryProvider.overrideWithValue(
            MockAuthRepository(latency: Duration.zero),
          ),
          networkStatusProvider.overrideWithValue(const Stream<bool>.empty()),
        ],
      );
      addTearDown(signedOut.dispose);
      await signedOut.read(authControllerProvider.future);
      signedOut.read(syncServiceProvider);
      await signedOut.read(syncServiceProvider.notifier).sync();
      expect(h.sent, isEmpty);
      expect(await h.queue.all(), hasLength(2));
    });
  });

  group('OnlineNotifier', () {
    test('follows the network, and what requests report', () async {
      final network = StreamController<bool>();
      final c = ProviderContainer(
        overrides: [networkStatusProvider.overrideWithValue(network.stream)],
      );
      addTearDown(() {
        c.dispose();
        network.close();
      });
      expect(c.read(onlineProvider), isTrue);

      network.add(false);
      await Future<void>.delayed(Duration.zero);
      expect(c.read(onlineProvider), isFalse);

      network.add(true);
      await Future<void>.delayed(Duration.zero);
      expect(c.read(onlineProvider), isTrue);

      // A request that dies on the network flips it, and one that gets
      // through flips it back (a wifi with no internet looks like network up).
      c.read(onlineProvider.notifier).report(false);
      expect(c.read(onlineProvider), isFalse);
      c.read(onlineProvider.notifier).report(true);
      expect(c.read(onlineProvider), isTrue);
    });

    test('the demo switch holds offline against everything else', () async {
      final c = ProviderContainer(
        overrides: [
          networkStatusProvider.overrideWithValue(const Stream<bool>.empty()),
        ],
      );
      addTearDown(c.dispose);
      c.read(onlineProvider.notifier).toggle();
      expect(c.read(onlineProvider), isFalse);
      c.read(onlineProvider.notifier).report(true);
      expect(c.read(onlineProvider), isFalse);
      c.read(onlineProvider.notifier).toggle();
      expect(c.read(onlineProvider), isTrue);
    });
  });
}
