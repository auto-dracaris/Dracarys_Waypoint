import 'package:driver_app/app.dart';
import 'package:driver_app/core/router/app_router.dart';
import 'package:driver_app/features/auth/data/auth_providers.dart';
import 'package:driver_app/features/auth/data/mock_auth_repository.dart';
import 'package:driver_app/features/notifications/data/mock_notifications_repository.dart';
import 'package:driver_app/features/notifications/data/notifications_providers.dart';
import 'package:driver_app/features/trips/data/mock_trips_repository.dart';
import 'package:driver_app/features/trips/data/trips_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

Widget buildApp() => ProviderScope(
      overrides: [
        authRepositoryProvider
            .overrideWithValue(MockAuthRepository(latency: Duration.zero)),
        tripsRepositoryProvider
            .overrideWithValue(MockTripsRepository(latency: Duration.zero)),
        notificationsRepositoryProvider.overrideWithValue(
            MockNotificationsRepository(latency: Duration.zero)),
        splashDurationProvider.overrideWithValue(Duration.zero),
      ],
      child: const WaypointDriverApp(),
    );

Future<void> signIn(WidgetTester tester) async {
  await tester.enterText(find.byKey(const Key('email')), 'nimal@waypoint.lk');
  await tester.enterText(find.byKey(const Key('password')), 'secret1');
  await tester.tap(find.byKey(const Key('login-submit')));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('splash goes to login when signed out', (tester) async {
    await tester.pumpWidget(buildApp());
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('waypoint-logo')), findsOneWidget);
    expect(find.text('Sign in'), findsWidgets);
    expect(find.byKey(const Key('email')), findsOneWidget);
  });

  testWidgets('invalid login shows inline validation and stays', (tester) async {
    await tester.pumpWidget(buildApp());
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('email')), '   ');
    await tester.enterText(find.byKey(const Key('password')), '123');
    await tester.tap(find.byKey(const Key('login-submit')));
    await tester.pumpAndSettle();
    expect(find.text('Enter a valid email'), findsOneWidget);
    expect(find.text('Password must be at least 6 characters'), findsOneWidget);
    expect(find.byKey(const Key('email')), findsOneWidget);
  });

  testWidgets('login lands on trips, tabs work, sign out returns to login',
      (tester) async {
    await tester.pumpWidget(buildApp());
    await tester.pumpAndSettle();
    await signIn(tester);

    expect(find.text('Trip 1'), findsOneWidget);

    await tester.tap(find.text('Updates'));
    await tester.pumpAndSettle();
    expect(find.text('Trip 1 stop sequence updated'), findsOneWidget);

    await tester.tap(find.text('Account'));
    await tester.pumpAndSettle();
    expect(find.text('Nimal Silva'), findsOneWidget);

    await tester.tap(find.byKey(const Key('sign-out')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('email')), findsOneWidget);
    expect(find.text('Account'), findsNothing);
    expect(GoRouter.of(tester.element(find.byKey(const Key('email')))).canPop(),
        isFalse); // no way back into the shell
  });

  testWidgets('sign up with a registered email shows an error and stays',
      (tester) async {
    await tester.pumpWidget(buildApp());
    await tester.pumpAndSettle();

    Future<void> submitSignUp() async {
      await tester.enterText(find.byKey(const Key('name')), 'Kasun Perera');
      await tester.enterText(find.byKey(const Key('email')), 'k@y.lk');
      await tester.enterText(find.byKey(const Key('password')), 'secret1');
      await tester.enterText(find.byKey(const Key('confirm')), 'secret1');
      await tester.tap(find.byKey(const Key('signup-submit')));
      await tester.pumpAndSettle();
    }

    await tester.tap(find.byKey(const Key('go-signup')));
    await tester.pumpAndSettle();
    await submitSignUp(); // first time succeeds -> shell
    expect(find.text('Trip 1'), findsOneWidget);

    await tester.tap(find.text('Account'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('sign-out')));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('go-signup')));
    await tester.pumpAndSettle();
    await submitSignUp(); // duplicate
    expect(find.text('This email is already registered'), findsOneWidget);
    expect(find.byKey(const Key('confirm')), findsOneWidget);
  });
}
