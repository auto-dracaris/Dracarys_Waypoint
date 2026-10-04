import 'package:driver_app/core/connectivity/online_provider.dart';
import 'package:driver_app/core/theme/app_theme.dart';
import 'package:driver_app/features/sync/application/sync_service.dart';
import 'package:driver_app/features/sync/domain/pending_action.dart';
import 'package:driver_app/features/sync/presentation/sync_status_bar.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

/// A sync service that only holds a state: no timers, no storage.
class _FakeSync extends SyncService {
  _FakeSync(this.initial);

  final SyncState initial;
  int kicks = 0;
  final dismissed = <String>[];

  @override
  SyncState build() => initial;

  @override
  void kick() => kicks++;

  @override
  Future<void> dismiss(String id) async {
    dismissed.add(id);
    state = state.copyWith(
      rejected: [
        for (final a in state.rejected)
          if (a.id != id) a,
      ],
    );
  }
}

PendingAction action(
  String id,
  ActionKind kind, {
  ActionState state = ActionState.pending,
  String? error,
}) => PendingAction(
  id: id,
  kind: kind,
  tripId: 't',
  stopId: '41',
  createdAt: DateTime(2026, 10, 4, 8, 5),
  body: const {},
  meta: const {'stopName': 'Waypoint Fresh'},
  state: state,
  error: error,
);

Future<_FakeSync> pump(
  WidgetTester tester,
  SyncState state, {
  bool online = true,
}) async {
  final fake = _FakeSync(state);
  tester.view.physicalSize = const Size(402 * 3, 900 * 3);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        syncServiceProvider.overrideWith(() => fake),
        networkStatusProvider.overrideWithValue(const Stream<bool>.empty()),
      ],
      child: MaterialApp(
        theme: AppTheme.light,
        home: const Scaffold(body: Column(children: [SyncStatusBar()])),
      ),
    ),
  );
  if (!online) {
    ProviderScope.containerOf(tester.element(find.byType(Column).first))
        .read(onlineProvider.notifier)
        .toggle();
  }
  await tester.pumpAndSettle();
  return fake;
}

void main() {
  testWidgets('nothing waiting: nothing shown', (tester) async {
    await pump(tester, const SyncState());
    expect(find.byKey(const Key('sync-status')), findsNothing);
  });

  testWidgets('counts what is waiting', (tester) async {
    await pump(
      tester,
      SyncState(
        pending: [
          action('a', ActionKind.arrive),
          action('b', ActionKind.complete),
        ],
      ),
    );
    expect(find.text('2 changes waiting to sync'), findsOneWidget);
  });

  testWidgets('one change is singular', (tester) async {
    await pump(tester, SyncState(pending: [action('a', ActionKind.arrive)]));
    expect(find.text('1 change waiting to sync'), findsOneWidget);
  });

  testWidgets('offline it says it will send when online', (tester) async {
    await pump(
      tester,
      SyncState(pending: [action('a', ActionKind.arrive)]),
      online: false,
    );
    expect(find.textContaining('will send when online'), findsOneWidget);
  });

  testWidgets('a refused action is called out', (tester) async {
    await pump(
      tester,
      SyncState(
        rejected: [
          action(
            'a',
            ActionKind.complete,
            state: ActionState.rejected,
            error: 'Wrong code',
          ),
        ],
      ),
    );
    expect(find.text('1 not accepted by the server'), findsOneWidget);
  });

  testWidgets('tapping lists each item with its stop and time', (tester) async {
    await pump(
      tester,
      SyncState(
        pending: [
          action('a', ActionKind.arrive),
          action('b', ActionKind.proof),
        ],
      ),
    );
    await tester.tap(find.byKey(const Key('sync-status')));
    await tester.pumpAndSettle();

    expect(find.text('Arrival recorded · Waypoint Fresh'), findsOneWidget);
    expect(find.text('Proof of delivery · Waypoint Fresh'), findsOneWidget);
    expect(find.text('08:05 AM'), findsNWidgets(2));
  });

  testWidgets('Sync now asks the service to try again', (tester) async {
    final fake = await pump(
      tester,
      SyncState(pending: [action('a', ActionKind.arrive)]),
    );
    await tester.tap(find.byKey(const Key('sync-status')));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('sync-now')));
    await tester.pump();
    expect(fake.kicks, 1);
  });

  testWidgets('a refusal shows its reason and can be dismissed', (
    tester,
  ) async {
    final fake = await pump(
      tester,
      SyncState(
        rejected: [
          action(
            'x',
            ActionKind.complete,
            state: ActionState.rejected,
            error: 'The stop order has changed. Review the route update first',
          ),
        ],
      ),
    );
    await tester.tap(find.byKey(const Key('sync-status')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('sync-error')), findsOneWidget);
    expect(find.textContaining('stop order has changed'), findsWidgets);

    await tester.tap(find.byKey(const Key('dismiss-x')));
    await tester.pumpAndSettle();
    expect(fake.dismissed, ['x']);
    expect(find.byKey(const Key('sync-error')), findsNothing);
  });
}
