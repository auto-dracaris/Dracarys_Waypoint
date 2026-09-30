import 'package:driver_app/core/clock.dart';
import 'package:driver_app/core/theme/app_theme.dart';
import 'package:driver_app/features/auth/data/auth_providers.dart';
import 'package:driver_app/features/auth/data/mock_auth_repository.dart';
import 'package:driver_app/features/notifications/data/mock_notifications_repository.dart';
import 'package:driver_app/features/notifications/data/notifications_providers.dart';
import 'package:driver_app/features/notifications/data/notifications_repository.dart';
import 'package:driver_app/features/notifications/domain/app_notification.dart';
import 'package:driver_app/features/notifications/presentation/updates_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

final _now = DateTime(2026, 9, 29, 9, 0);

class _FixedNotificationsRepository implements NotificationsRepository {
  _FixedNotificationsRepository(this.items);

  final List<AppNotification> items;

  @override
  Future<List<AppNotification>> getNotifications() async => items;
}

Future<void> pumpScreen(WidgetTester tester, NotificationsRepository repo) async {
  tester.view.physicalSize = const Size(402 * 3, 1800 * 3);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);

  final router = GoRouter(initialLocation: '/updates', routes: [
    GoRoute(path: '/updates', builder: (_, _) => const UpdatesScreen()),
    GoRoute(
        path: '/trips',
        builder: (_, _) => const Scaffold(body: Text('Trips page'))),
  ]);
  await tester.pumpWidget(ProviderScope(
    overrides: [
      notificationsRepositoryProvider.overrideWithValue(repo),
      authRepositoryProvider
          .overrideWithValue(MockAuthRepository(latency: Duration.zero)),
      clockProvider.overrideWithValue(() => _now),
    ],
    child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
  ));
  await tester.pumpAndSettle();
}

MockNotificationsRepository mockRepo() =>
    MockNotificationsRepository(latency: Duration.zero, now: () => _now);

void main() {
  testWidgets('renders the top bar, title, tabs and grouped cards',
      (tester) async {
    await pumpScreen(tester, mockRepo());

    expect(find.byKey(const Key('back-link')), findsOneWidget);
    expect(find.text('My trips'), findsOneWidget);
    expect(find.text('Online'), findsOneWidget);
    expect(find.text('Notifications'), findsOneWidget);

    // Segmented control with live counts.
    expect(find.text('All'), findsOneWidget);
    expect(find.text('4'), findsOneWidget);
    expect(find.text('Errors'), findsOneWidget);
    expect(find.text('1'), findsOneWidget);

    // Day groups, newest first.
    expect(find.text('TODAY'), findsOneWidget);
    expect(find.text('YESTERDAY'), findsOneWidget);

    for (final title in [
      'Trip 1 stop sequence updated',
      'Loading started for Trip 1',
      'Trip 2 assigned',
      'Latest trip saved offline',
    ]) {
      expect(find.text(title), findsOneWidget);
    }
    expect(find.text('2 min ago'), findsOneWidget);
    expect(find.text('8 min ago'), findsOneWidget);
    expect(find.text('Yesterday · 5:20 PM'), findsOneWidget);
    expect(find.text('Yesterday · 5:15 PM'), findsOneWidget);
    expect(find.text('2 stops · Planned departure 07:00 AM'), findsOneWidget);
    expect(find.text('Map availability depends on downloaded map data.'),
        findsOneWidget);
  });

  testWidgets('action buttons follow the design', (tester) async {
    await pumpScreen(tester, mockRepo());

    expect(find.text('Review changes'), findsOneWidget);
    expect(find.text('View trip'), findsNWidgets(2));
  });

  testWidgets('the Errors tab filters the feed and All restores it',
      (tester) async {
    await pumpScreen(tester, mockRepo());

    await tester.tap(find.text('Errors'));
    await tester.pumpAndSettle();
    expect(find.text('Trip 1 stop sequence updated'), findsOneWidget);
    expect(find.text('Loading started for Trip 1'), findsNothing);
    expect(find.text('YESTERDAY'), findsNothing);

    await tester.tap(find.text('All'));
    await tester.pumpAndSettle();
    expect(find.text('Loading started for Trip 1'), findsOneWidget);
    expect(find.text('YESTERDAY'), findsOneWidget);
  });

  testWidgets('the Errors tab explains when there are no errors',
      (tester) async {
    final calm = (await tester.runAsync(mockRepo().getNotifications))!
        .where((n) => n.severity != NotificationSeverity.error)
        .toList();
    await pumpScreen(tester, _FixedNotificationsRepository(calm));

    await tester.tap(find.text('Errors'));
    await tester.pumpAndSettle();
    expect(find.text('No errors'), findsOneWidget);
  });

  testWidgets('shows an empty state when there are no notifications',
      (tester) async {
    await pumpScreen(tester, _FixedNotificationsRepository(const []));
    expect(find.text('No updates'), findsOneWidget);
  });

  testWidgets('the back link returns to My trips', (tester) async {
    await pumpScreen(tester, mockRepo());

    await tester.tap(find.byKey(const Key('back-link')));
    await tester.pumpAndSettle();
    expect(find.text('Trips page'), findsOneWidget);
  });

  testWidgets('long-pressing the status pill toggles offline', (tester) async {
    await pumpScreen(tester, mockRepo());

    await tester.longPress(find.text('Online'));
    await tester.pumpAndSettle();
    expect(find.text('Offline'), findsOneWidget);
  });
}
