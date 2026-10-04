import 'package:driver_app/core/connectivity/online_provider.dart';
import 'package:driver_app/core/crypto/delivery_code.dart';
import 'package:driver_app/features/trips/domain/trip.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/test_app.dart';
import 'codes_flow_test.dart' show CodedTripsRepository;

Future<void> tapVisible(WidgetTester tester, Finder f) async {
  await tester.ensureVisible(f);
  await tester.tap(f);
  await tester.pumpAndSettle();
}

void main() {
  // The phone checks the code against the hash it was given; the real PBKDF2
  // is covered in delivery_code_test.dart, so a stand-in decides here.
  final checked = <String>[];
  final verifier = deliveryCodeVerifierProvider.overrideWithValue((
    code,
    _,
  ) async {
    checked.add(code);
    return code == CodedTripsRepository.deliveryCode;
  });

  Future<CodedTripsRepository> atTheDock(
    WidgetTester tester, {
    required bool online,
  }) async {
    checked.clear();
    final repo = CodedTripsRepository();
    await tester.runAsync(() => repo.markArrived('trip-1'));
    await pumpTripRoutes(
      tester,
      location: '$stop3/proof',
      trips: repo,
      overrides: [verifier],
    );
    if (!online) {
      ProviderScope.containerOf(tester.element(find.text('Received by')))
          .read(onlineProvider.notifier)
          .toggle(); // no signal
      await tester.pump();
    }
    return repo;
  }

  Future<void> name(WidgetTester tester) async {
    await tester.enterText(find.byKey(const Key('staff-name')), 'Kumara');
    await tester.pump();
  }

  Future<void> verify(WidgetTester tester, String code) async {
    await tester.enterText(find.byKey(const Key('otp-input')), code);
    await tester.pump();
    await tapVisible(tester, find.byKey(const Key('otp-verify')));
  }

  const mismatch = 'That code does not match the one sent to the outlet';

  testWidgets('a right code is confirmed on the phone and completes the stop', (
    tester,
  ) async {
    final repo = await atTheDock(tester, online: false);
    await name(tester);
    await verify(tester, CodedTripsRepository.deliveryCode);
    await tapVisible(tester, find.text('Complete stop'));

    expect(checked, [CodedTripsRepository.deliveryCode]);
    expect(repo.lastDeliveryCode, CodedTripsRepository.deliveryCode);
    expect(find.textContaining('saved on this phone'), findsOneWidget);
    final trip = (await tester.runAsync(() => repo.getTrip('trip-1')))!;
    expect(trip.completedStops, 3);
  });

  testWidgets('a wrong code is caught at the dock and nothing is saved', (
    tester,
  ) async {
    final repo = await atTheDock(tester, online: false);
    await name(tester);
    await verify(tester, '999999');

    expect(find.text(mismatch), findsOneWidget);
    await tapVisible(tester, find.text('Complete stop'));
    expect(repo.lastDeliveryCode, isNull);
    final trip = (await tester.runAsync(() => repo.getTrip('trip-1')))!;
    expect(trip.completedStops, 2);

    // Typing again clears the message, and a right code then goes through.
    await tester.enterText(
      find.byKey(const Key('otp-input')),
      CodedTripsRepository.deliveryCode,
    );
    await tester.pump();
    expect(find.text(mismatch), findsNothing);
    await tapVisible(tester, find.byKey(const Key('otp-verify')));
    await tapVisible(tester, find.text('Complete stop'));
    expect(repo.lastDeliveryCode, CodedTripsRepository.deliveryCode);
  });

  testWidgets('with a photo nothing is checked and the photo stands in', (
    tester,
  ) async {
    final repo = await atTheDock(tester, online: false);
    await name(tester);
    await tapVisible(tester, find.text('Photo'));
    await tapVisible(tester, find.text('Add photo'));
    await tapVisible(tester, find.text('Complete stop'));

    expect(checked, isEmpty);
    final trip = (await tester.runAsync(() => repo.getTrip('trip-1')))!;
    expect(trip.completedStops, 3);
  });

  testWidgets('online, a wrong code is caught on the phone too', (
    tester,
  ) async {
    final repo = await atTheDock(tester, online: true);
    await name(tester);
    await verify(tester, '999999');

    expect(checked, ['999999']);
    expect(find.text(mismatch), findsOneWidget);
    expect(repo.lastDeliveryCode, isNull);
  });

  testWidgets('starting a trip with no signal says it needs a connection', (
    tester,
  ) async {
    final repo = CodedTripsRepository(onTheRoad: false);
    await tester.runAsync(() => repo.simulateLoadingComplete('trip-1'));
    await pumpTripRoutes(tester, location: overview1, trips: repo);
    ProviderScope.containerOf(tester.element(find.text('Ready to depart')))
        .read(onlineProvider.notifier)
        .toggle();
    await tester.pump();

    await tapVisible(tester, find.text('Ready to depart'));

    expect(find.textContaining('need a connection to start'), findsOneWidget);
    expect(find.text('Start code'), findsNothing);
    final trip = (await tester.runAsync(() => repo.getTrip('trip-1')))!;
    expect(trip.status, TripStatus.ready);
  });
}
