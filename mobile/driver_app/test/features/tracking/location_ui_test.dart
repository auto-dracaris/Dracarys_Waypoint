import 'package:driver_app/core/connectivity/online_provider.dart';
import 'package:driver_app/core/theme/app_theme.dart';
import 'package:driver_app/features/sync/application/sync_service.dart';
import 'package:driver_app/features/sync/presentation/sync_status_bar.dart';
import 'package:driver_app/features/tracking/application/location_tracker.dart';
import 'package:driver_app/features/tracking/presentation/location_notice.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _EmptySync extends SyncService {
  @override
  SyncState build() => const SyncState();
}

class _FakeTracker extends LocationTracker {
  _FakeTracker(this.initial);

  final TrackerState initial;
  int ticks = 0;
  final forced = <bool>[];

  @override
  TrackerState build() => initial;

  @override
  Future<void> tick() async => ticks++;

  @override
  Future<void> flush({bool force = false}) async => forced.add(force);
}

Future<_FakeTracker> pump(
  WidgetTester tester,
  TrackerState state, {
  bool online = true,
  Widget child = const Column(children: [SyncStatusBar(), LocationNotice()]),
}) async {
  final tracker = _FakeTracker(state);
  tester.view.physicalSize = const Size(402 * 3, 900 * 3);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        syncServiceProvider.overrideWith(_EmptySync.new),
        locationTrackerProvider.overrideWith(() => tracker),
        networkStatusProvider.overrideWithValue(const Stream<bool>.empty()),
      ],
      child: MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(body: child),
      ),
    ),
  );
  if (!online) {
    ProviderScope.containerOf(tester.element(find.byType(Column).first))
        .read(onlineProvider.notifier)
        .toggle();
  }
  await tester.pumpAndSettle();
  return tracker;
}

void main() {
  group('location notice', () {
    testWidgets('hidden when location works', (tester) async {
      await pump(tester, const TrackerState(tracking: true));
      expect(find.byKey(const Key('location-notice')), findsNothing);
    });

    testWidgets('says why the dispatcher cannot see the vehicle', (
      tester,
    ) async {
      await pump(
        tester,
        const TrackerState(problem: 'Location is switched off on this phone.'),
      );
      expect(find.byKey(const Key('location-notice')), findsOneWidget);
      expect(find.textContaining('switched off'), findsOneWidget);
    });

    testWidgets('Try again asks the tracker to look again', (tester) async {
      final tracker = await pump(
        tester,
        const TrackerState(problem: 'Location is switched off.'),
      );
      await tester.tap(find.byKey(const Key('location-retry')));
      await tester.pump();
      expect(tracker.ticks, 1);
    });
  });

  group('sync bar and location points', () {
    testWidgets('a point or two on their way is not worth a bar', (
      tester,
    ) async {
      await pump(tester, const TrackerState(tracking: true, pending: 2));
      expect(find.byKey(const Key('sync-status')), findsNothing);
    });

    testWidgets('offline, the points piling up are shown', (tester) async {
      await pump(
        tester,
        const TrackerState(tracking: true, pending: 14),
        online: false,
      );
      expect(find.byKey(const Key('sync-status')), findsOneWidget);
      expect(find.textContaining('14 location points waiting'), findsOneWidget);
      expect(find.textContaining('will send when online'), findsOneWidget);
    });

    testWidgets('one point reads in the singular', (tester) async {
      await pump(
        tester,
        const TrackerState(tracking: true, pending: 1),
        online: false,
      );
      expect(find.textContaining('1 location point waiting'), findsOneWidget);
    });

    testWidgets('online, a real pile is shown too', (tester) async {
      await pump(tester, const TrackerState(tracking: true, pending: 400));
      expect(
        find.textContaining('400 location points waiting'),
        findsOneWidget,
      );
    });

    testWidgets('the sheet explains and Sync now flushes them', (tester) async {
      final tracker = await pump(
        tester,
        const TrackerState(tracking: true, pending: 40),
        online: false,
      );
      await tester.tap(find.byKey(const Key('sync-status')));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('location-backlog')), findsOneWidget);
      expect(find.textContaining('40 vehicle location points'), findsOneWidget);

      await tester.tap(find.byKey(const Key('sync-now')));
      await tester.pump();
      expect(tracker.forced, [true]);
    });
  });
}
