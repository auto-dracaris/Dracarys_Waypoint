import 'package:driver_app/core/api/api_exception.dart';
import 'package:driver_app/features/trips/domain/delivery_code_hash.dart';
import 'package:driver_app/features/trips/domain/stop.dart';
import 'package:driver_app/features/trips/data/mock_trips_repository.dart';
import 'package:driver_app/features/trips/domain/trip.dart';
import 'package:driver_app/core/crypto/delivery_code.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/test_app.dart';

/// A trip repository that behaves like the real API: it wants the loader's
/// start code and the outlet's delivery code, and checks them.
class CodedTripsRepository extends MockTripsRepository {
  CodedTripsRepository({bool onTheRoad = true})
    : super(
        latency: Duration.zero,
        onTheRoad: onTheRoad,
        today: DateTime(2026, 9, 29),
        now: () => testNow,
      );

  static const startCode = '482913';
  static const deliveryCode = '123456';

  String? lastDeliveryCode;

  /// What the phone was given to check the outlet code with no signal; the
  /// tests replace the real hash check, so any value will do.
  static const hash = DeliveryCodeHash(salt: '00', iterations: 1, hash: '00');

  @override
  Future<Trip> getTrip(String id) async {
    final trip = await super.getTrip(id);
    return trip.copyWith(
      stops: [
        for (final s in trip.stops)
          s.status == StopStatus.completed ? s : s.copyWith(deliveryCode: hash),
      ],
    );
  }

  @override
  bool get usesCodes => true;

  @override
  Future<Trip> startTrip(String tripId, {String? otp}) {
    if (otp != startCode) {
      throw const ApiException(400, 'That start code is not right');
    }
    return super.startTrip(tripId, otp: otp);
  }

  @override
  Future<Trip> completeStop(
    String tripId,
    String stopId, {
    Map<String, int> deliveredCases = const {},
    String? deliveryCode,
  }) {
    lastDeliveryCode = deliveryCode;
    return super.completeStop(
      tripId,
      stopId,
      deliveredCases: deliveredCases,
      deliveryCode: deliveryCode,
    );
  }
}

Future<void> tapVisible(WidgetTester tester, Finder f) async {
  await tester.ensureVisible(f);
  await tester.tap(f);
  await tester.pumpAndSettle();
}

void main() {
  group('start code', () {
    Future<CodedTripsRepository> readyRepo(WidgetTester tester) async {
      final repo = CodedTripsRepository(onTheRoad: false);
      await tester.runAsync(() => repo.simulateLoadingComplete('trip-1'));
      await pumpTripRoutes(tester, location: overview1, trips: repo);
      return repo;
    }

    testWidgets('departing asks for the code and starts with it', (
      tester,
    ) async {
      final repo = await readyRepo(tester);

      await tapVisible(tester, find.text('Ready to depart'));
      expect(find.text('Start code'), findsOneWidget);

      await tester.enterText(
        find.byKey(const Key('start-code')),
        CodedTripsRepository.startCode,
      );
      await tester.tap(find.byKey(const Key('start-code-submit')));
      await tester.pumpAndSettle();

      expect(find.text('NEXT STOP · 3 OF 4'), findsOneWidget);
      final trip = (await tester.runAsync(() => repo.getTrip('trip-1')))!;
      expect(trip.status, TripStatus.inProgress);
    });

    testWidgets('a code that is not 6 digits is refused before sending', (
      tester,
    ) async {
      final repo = await readyRepo(tester);
      await tapVisible(tester, find.text('Ready to depart'));

      await tester.enterText(find.byKey(const Key('start-code')), '12');
      await tester.tap(find.byKey(const Key('start-code-submit')));
      await tester.pumpAndSettle();

      expect(find.text('Enter the 6-digit start code'), findsOneWidget);
      final trip = (await tester.runAsync(() => repo.getTrip('trip-1')))!;
      expect(trip.status, TripStatus.ready);
    });

    testWidgets('the server refusing the code is shown and the trip stays', (
      tester,
    ) async {
      final repo = await readyRepo(tester);
      await tapVisible(tester, find.text('Ready to depart'));

      await tester.enterText(find.byKey(const Key('start-code')), '000000');
      await tester.tap(find.byKey(const Key('start-code-submit')));
      await tester.pumpAndSettle();

      expect(find.text('That start code is not right'), findsOneWidget);
      final trip = (await tester.runAsync(() => repo.getTrip('trip-1')))!;
      expect(trip.status, TripStatus.ready);
    });

    testWidgets('cancelling the dialog does nothing', (tester) async {
      final repo = await readyRepo(tester);
      await tapVisible(tester, find.text('Ready to depart'));

      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();

      final trip = (await tester.runAsync(() => repo.getTrip('trip-1')))!;
      expect(trip.status, TripStatus.ready);
    });

    testWidgets('the loading hook is mock-only: long-press does nothing', (
      tester,
    ) async {
      final repo = CodedTripsRepository(onTheRoad: false);
      await pumpTripRoutes(tester, location: overview1, trips: repo);

      await tester.longPress(find.byKey(const Key('loading-banner')));
      await tester.pumpAndSettle();

      final trip = (await tester.runAsync(() => repo.getTrip('trip-1')))!;
      expect(trip.status, TripStatus.loading);
    });
  });

  group('delivery code', () {
    final verifier = deliveryCodeVerifierProvider.overrideWithValue(
      (code, _) async => code == CodedTripsRepository.deliveryCode,
    );

    Future<CodedTripsRepository> arrived(WidgetTester tester) async {
      final repo = CodedTripsRepository();
      await tester.runAsync(() => repo.markArrived('trip-1'));
      await pumpTripRoutes(
        tester,
        location: '$stop3/proof',
        trips: repo,
        overrides: [verifier],
      );
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

    testWidgets('the code is sent with the completion', (tester) async {
      final repo = await arrived(tester);
      await name(tester);
      await verify(tester, CodedTripsRepository.deliveryCode);
      expect(find.byKey(const Key('otp-verified')), findsOneWidget);
      await tapVisible(tester, find.text('Complete stop'));

      expect(repo.lastDeliveryCode, CodedTripsRepository.deliveryCode);
      final trip = (await tester.runAsync(() => repo.getTrip('trip-1')))!;
      expect(trip.completedStops, 3);
    });

    testWidgets('a photo completes the stop without a code', (tester) async {
      final repo = await arrived(tester);
      await name(tester);
      await tapVisible(tester, find.text('Photo'));
      await tapVisible(tester, find.text('Add photo'));
      await tapVisible(tester, find.text('Complete stop'));

      expect(repo.lastDeliveryCode, isNull);
      final trip = (await tester.runAsync(() => repo.getTrip('trip-1')))!;
      expect(trip.completedStops, 3);
    });

    testWidgets('a malformed code is refused and blocks completing', (
      tester,
    ) async {
      final repo = await arrived(tester);
      await name(tester);
      await verify(tester, '12');
      expect(find.text('The code is 6 digits'), findsOneWidget);
      await tapVisible(tester, find.text('Complete stop'));

      final trip = (await tester.runAsync(() => repo.getTrip('trip-1')))!;
      expect(trip.completedStops, 2);
      expect(repo.lastDeliveryCode, isNull);
    });

    testWidgets('a code that was not verified does not complete the stop', (
      tester,
    ) async {
      final repo = await arrived(tester);
      await name(tester);
      await tester.enterText(
        find.byKey(const Key('otp-input')),
        CodedTripsRepository.deliveryCode,
      );
      await tapVisible(tester, find.text('Complete stop'));

      expect(
        find.text('Enter and verify the code from the store'),
        findsOneWidget,
      );
      final trip = (await tester.runAsync(() => repo.getTrip('trip-1')))!;
      expect(trip.completedStops, 2);
    });
  });
}
