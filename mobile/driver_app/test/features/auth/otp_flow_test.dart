import 'package:driver_app/app.dart';
import 'package:driver_app/core/router/app_router.dart';
import 'package:driver_app/features/auth/data/auth_providers.dart';
import 'package:driver_app/features/auth/data/mock_auth_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

Widget buildApp() => ProviderScope(
      overrides: [
        authRepositoryProvider
            .overrideWithValue(MockAuthRepository(latency: Duration.zero)),
        splashDurationProvider.overrideWithValue(Duration.zero),
      ],
      child: const WaypointDriverApp(),
    );

Future<void> tapKey(WidgetTester tester, String key) async {
  final finder = find.byKey(Key(key));
  await tester.ensureVisible(finder);
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

Future<void> openSignUp(WidgetTester tester) async {
  await tester.pumpWidget(buildApp());
  await tester.pumpAndSettle();
  await tapKey(tester, 'go-signup');
}

Future<void> fillSignUp(WidgetTester tester,
    {String password = 'Secret1!'}) async {
  await tester.enterText(find.byKey(const Key('firstName')), 'Kasun');
  await tester.enterText(find.byKey(const Key('lastName')), 'Perera');
  await tester.enterText(find.byKey(const Key('phone')), '077 111 1111');
  await tester.enterText(find.byKey(const Key('password')), password);
  await tester.enterText(find.byKey(const Key('confirm')), password);
  await tapKey(tester, 'signup-submit');
}

void main() {
  testWidgets('sign-up leads to the OTP screen, then back to sign in',
      (tester) async {
    await openSignUp(tester);
    await fillSignUp(tester);
    expect(find.byKey(const Key('otp')), findsOneWidget);

    await tester.enterText(find.byKey(const Key('otp')), '123456');
    await tapKey(tester, 'otp-submit');

    expect(find.byKey(const Key('login-submit')), findsOneWidget);
    expect(find.text('Phone verified. Sign in to continue.'), findsOneWidget);
  });

  testWidgets('a wrong OTP shows the error and stays', (tester) async {
    await openSignUp(tester);
    await fillSignUp(tester);
    await tester.enterText(find.byKey(const Key('otp')), '000000');
    await tapKey(tester, 'otp-submit');
    expect(find.text('Invalid or expired code'), findsOneWidget);
    expect(find.byKey(const Key('otp')), findsOneWidget);
  });

  testWidgets('a weak sign-up password is rejected before any request',
      (tester) async {
    await openSignUp(tester);
    await fillSignUp(tester, password: 'secret1');
    expect(
        find.text(
            'Use 6+ characters with an uppercase letter and a special character'),
        findsOneWidget);
    expect(find.byKey(const Key('otp')), findsNothing);
  });

  testWidgets('forgot then reset password returns to sign in',
      (tester) async {
    await tester.pumpWidget(buildApp());
    await tester.pumpAndSettle();
    await tapKey(tester, 'go-forgot');
    await tester.enterText(find.byKey(const Key('forgot-phone')), '0771111111');
    await tapKey(tester, 'forgot-submit');

    await tester.enterText(find.byKey(const Key('reset-otp')), '123456');
    await tester.enterText(
        find.byKey(const Key('reset-password')), 'Newpass1!');
    await tester.enterText(find.byKey(const Key('reset-confirm')), 'Newpass1!');
    await tapKey(tester, 'reset-submit');

    expect(find.byKey(const Key('login-submit')), findsOneWidget);
    expect(find.text('Password updated. Sign in with your new password.'),
        findsOneWidget);
  });
}
