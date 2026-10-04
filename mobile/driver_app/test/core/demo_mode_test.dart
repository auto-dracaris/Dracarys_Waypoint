import 'package:driver_app/core/demo_mode.dart';
import 'package:driver_app/core/theme/app_theme.dart';
import 'package:driver_app/core/widgets/demo_mode_switch.dart';
import 'package:driver_app/features/auth/data/auth_providers.dart';
import 'package:driver_app/features/auth/data/http_auth_repository.dart';
import 'package:driver_app/features/auth/data/mock_auth_repository.dart';
import 'package:driver_app/features/trips/data/http_trips_repository.dart';
import 'package:driver_app/features/trips/data/mock_trips_repository.dart';
import 'package:driver_app/features/trips/data/trips_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('the switch swaps every repository between demo data and the server',
      () {
    final c = ProviderContainer();
    addTearDown(c.dispose);

    expect(c.read(demoModeProvider), isFalse);
    expect(c.read(tripsRepositoryProvider), isA<HttpTripsRepository>());
    expect(c.read(authRepositoryProvider), isA<HttpAuthRepository>());

    c.read(demoModeProvider.notifier).set(true);
    expect(c.read(tripsRepositoryProvider), isA<MockTripsRepository>());
    expect(c.read(authRepositoryProvider), isA<MockAuthRepository>());

    c.read(demoModeProvider.notifier).set(false);
    expect(c.read(tripsRepositoryProvider), isA<HttpTripsRepository>());
  });

  test('it starts where the build or the saved setting says', () {
    final c = ProviderContainer(
        overrides: [initialDemoModeProvider.overrideWithValue(true)]);
    addTearDown(c.dispose);
    expect(c.read(demoModeProvider), isTrue);
  });

  testWidgets('the switch shows the state and flips it', (tester) async {
    await tester.pumpWidget(ProviderScope(
      child: MaterialApp(
        theme: AppTheme.light,
        home: const Scaffold(body: DemoModeSwitch()),
      ),
    ));
    expect(find.text('Using the real server.'), findsOneWidget);

    await tester.tap(find.byKey(const Key('demo-switch')));
    await tester.pumpAndSettle();
    expect(find.textContaining('Pretend trips'), findsOneWidget);

    await tester.tap(find.byKey(const Key('demo-switch')));
    await tester.pumpAndSettle();
    expect(find.text('Using the real server.'), findsOneWidget);
  });
}
