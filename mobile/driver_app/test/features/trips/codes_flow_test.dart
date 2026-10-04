import 'package:driver_app/core/api/api_exception.dart';
import 'package:driver_app/features/trips/domain/delivery_code_hash.dart';
import 'package:driver_app/features/trips/domain/stop.dart';
import 'package:driver_app/features/trips/data/mock_trips_repository.dart';
import 'package:driver_app/features/trips/domain/trip.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/test_app.dart';

/// A trip repository that behaves like the real API: it wants the loader's
/// start code and the outlet's delivery code, and checks them.
class CodedTripsRepository extends MockTripsRepository {
  CodedTripsRepository()
    : super(
        latency: Duration.zero,
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
    return trip.copyWith(stops: [
      for (final s in trip.stops)
        s.status == StopStatus.completed ? s : s.copyWith(deliveryCode: hash),
    ]);
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
      final repo = CodedTripsRepository();
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
      final repo = CodedTripsRepository();
      await pumpTripRoutes(tester, location: overview1, trips: repo);

      await tester.longPress(find.byKey(const Key('loading-banner')));
      await tester.pumpAndSettle();

      final trip = (await tester.runAsync(() => repo.getTrip('trip-1')))!;
      expect(trip.status, TripStatus.loading);
    });
  });

  group('delivery code', () {
    Future<CodedTripsRepository> arrived(WidgetTester tester) async {
      final repo = CodedTripsRepository();
      await tester.runAsync(() => repo.markArrived('trip-1'));
      await pumpTripRoutes(tester, location: '$stop3/proof', trips: repo);
      return repo;
    }

    Future<void> signAndName(WidgetTester tester) async {
      await tester.enterText(find.byKey(const Key('staff-name')), 'Kumara');
      await tester.drag(
        find.byKey(const Key('signature-surface')),
        const Offset(80, 30),
      );
      await tester.pump();
    }

    testWidgets('the code is sent with the completion', (tester) async {
      final repo = await arrived(tester);
      await signAndName(tester);
      await tester.enterText(
        find.byKey(const Key('delivery-code')),
        CodedTripsRepository.deliveryCode,
      );
      await tapVisible(tester, find.text('Complete stop'));

      expect(repo.lastDeliveryCode, CodedTripsRepository.deliveryCode);
      final trip = (await tester.runAsync(() => repo.getTrip('trip-1')))!;
      expect(trip.completedStops, 3);
    });

    testWidgets('the code may be left out when the proof stands in', (
      tester,
    ) async {
      final repo = await arrived(tester);
      await signAndName(tester);
      await tapVisible(tester, find.text('Complete stop'));

      expect(repo.lastDeliveryCode, '');
      final trip = (await tester.runAsync(() => repo.getTrip('trip-1')))!;
      expect(trip.completedStops, 3);
    });

    testWidgets('a malformed code blocks completing', (tester) async {
      final repo = await arrived(tester);
      await signAndName(tester);
      await tester.enterText(find.byKey(const Key('delivery-code')), '12ab');
      await tapVisible(tester, find.text('Complete stop'));

      expect(find.text('The delivery code is 6 digits'), findsOneWidget);
      final trip = (await tester.runAsync(() => repo.getTrip('trip-1')))!;
      expect(trip.completedStops, 2);
      expect(repo.lastDeliveryCode, isNull);
    });

    testWidgets('the mock does not ask for a code', (tester) async {
      final repo = testTripsRepository();
      await tester.runAsync(() => repo.markArrived('trip-1'));
      await pumpTripRoutes(tester, location: '$stop3/proof', trips: repo);
      expect(find.byKey(const Key('delivery-code')), findsNothing);
    });
  });
}
