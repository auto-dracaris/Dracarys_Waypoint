import 'package:driver_app/app.dart';
import 'package:driver_app/core/router/app_router.dart';
import 'package:driver_app/features/auth/data/auth_providers.dart';
import 'package:driver_app/features/auth/data/auth_repository.dart';
import 'package:driver_app/features/auth/domain/driver.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

/// Every call fails with a non-AuthException, like a dropped connection would.
class BrokenAuthRepository implements AuthRepository {
  @override
  Future<Driver?> currentDriver() async => throw StateError('offline');

  @override
  Future<Driver> login({required String email, required String password}) async =>
      throw StateError('offline');

  @override
  Future<Driver> signUp({
    required String name,
    required String email,
    required String password,
  }) async =>
      throw StateError('offline');

  @override
  Future<void> logout() async {}
}

Widget buildApp() => ProviderScope(
      overrides: [
        authRepositoryProvider.overrideWithValue(BrokenAuthRepository()),
        splashDurationProvider.overrideWithValue(Duration.zero),
      ],
      child: const WaypointDriverApp(),
    );

void main() {
  testWidgets('splash falls back to login when the session check fails',
      (tester) async {
    await tester.pumpWidget(buildApp());
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('login-submit')), findsOneWidget);
  });

  testWidgets('login shows a friendly message on an unexpected error',
      (tester) async {
    await tester.pumpWidget(buildApp());
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('email')), 'a@b.lk');
    await tester.enterText(find.byKey(const Key('password')), 'secret1');
    await tester.tap(find.byKey(const Key('login-submit')));
    await tester.pumpAndSettle();
    expect(find.text('Something went wrong. Please try again.'),
        findsOneWidget);
    expect(find.byKey(const Key('login-submit')), findsOneWidget);
  });
}
