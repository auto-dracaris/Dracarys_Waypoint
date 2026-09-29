import 'package:driver_app/core/router/auth_redirect.dart';
import 'package:driver_app/features/auth/data/mock_auth_repository.dart';
import 'package:driver_app/features/auth/domain/driver.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

const AsyncValue<Driver?> loading = AsyncLoading<Driver?>();
const AsyncValue<Driver?> signedOut = AsyncData<Driver?>(null);
const AsyncValue<Driver?> signedIn =
    AsyncData<Driver?>(MockAuthRepository.demoDriver);

void main() {
  test('splash is never redirected', () {
    for (final auth in [loading, signedOut, signedIn]) {
      expect(authRedirect(location: '/splash', auth: auth), isNull);
    }
  });

  test('while auth loads, protected routes wait on the splash', () {
    expect(authRedirect(location: '/account', auth: loading), '/splash');
    expect(authRedirect(location: '/login', auth: loading), isNull);
  });

  test('signed out users are sent to login from protected routes', () {
    expect(authRedirect(location: '/trips', auth: signedOut), '/login');
    expect(authRedirect(location: '/login', auth: signedOut), isNull);
    expect(authRedirect(location: '/signup', auth: signedOut), isNull);
  });

  test('an auth error is treated as signed out', () {
    final error = AsyncError<Driver?>(Exception('x'), StackTrace.empty);
    expect(authRedirect(location: '/trips', auth: error), '/login');
  });

  test('signed in users skip login and sign-up', () {
    expect(authRedirect(location: '/login', auth: signedIn), '/trips');
    expect(authRedirect(location: '/signup', auth: signedIn), '/trips');
    expect(authRedirect(location: '/updates', auth: signedIn), isNull);
  });
}
