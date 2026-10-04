import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_application/models/trip.dart';
import 'package:flutter_application/screens/trips_screen.dart';
import 'package:flutter_application/screens/trips_detail_screen.dart';

import 'package:flutter_application/services/auth_service.dart';
import 'package:flutter_application/services/trip_service.dart';

Map<String, dynamic> trip(String id) => {
  'id': id,
  'name': 'Trip 1',
  'vehicle': {'plate': 'VEH014'},
  'subtitle': 'Fresh · Colombo',
  'statusLabel': 'Ready to Load',
  'status': 'assigned',
  'planVersion': 3,
  'totalUnits': 28,
  'stopCount': 2,
  'departure': '07:10',
  'stops': [],
};

http.Response response(
  List<Map<String, dynamic>> items, {
  int pages = 1,
  int ready = 2,
}) => http.Response(
  jsonEncode({
    'data': {
      'items': items,
      'meta': {
        'totalPages': pages,
        'counts': {'readyToLoad': ready, 'inProgress': 1, 'awaitingPlan': 3},
      },
    },
  }),
  200,
);

void main() {
  test('tomorrow follows Colombo midnight and month boundaries', () {
    expect(
      TripService.tomorrowServiceDate(
        now: DateTime.parse('2026-10-04T18:29:00Z'),
      ),
      '2026-10-05',
    );
    expect(
      TripService.tomorrowServiceDate(
        now: DateTime.parse('2026-10-04T18:30:00Z'),
      ),
      '2026-10-06',
    );
    expect(
      TripService.tomorrowServiceDate(
        now: DateTime.parse('2026-12-31T12:00:00Z'),
      ),
      '2027-01-01',
    );
  });
  setUp(
    () => SharedPreferences.setMockInitialValues({
      AuthService.sessionKey: '{"accessToken":"test-token"}',
    }),
  );

  test(
    'fetches every page with the selected status and retains counts',
    () async {
      final pages = <String>[];
      final service = TripService(
        client: MockClient((request) async {
          expect(request.url.host, 'api.way-point.site');
          expect(request.url.queryParameters['status'], 'in_progress');
          expect(request.headers['Authorization'], 'Bearer test-token');
          final page = request.url.queryParameters['page']!;
          pages.add(page);
          return response([trip(page)], pages: 2);
        }),
      );
      addTearDown(service.dispose);
      final result = await service.getTrips(status: TripListStatus.inProgress);
      expect(pages, ['1', '2']);
      expect(result.trips.map((trip) => trip.id), ['1', '2']);
      expect(result.counts.awaitingPlan, 3);
    },
  );

  testWidgets('shows combined trips without tabs, including ready trips', (
    tester,
  ) async {
    final service = TripService(
      client: MockClient((request) async {
        if (request.url.path.endsWith('/selected')) {
          return http.Response(jsonEncode({'data': trip('selected')}), 200);
        }
        expect(request.url.queryParameters.containsKey('status'), isFalse);
        expect(request.url.queryParameters.containsKey('date'), isFalse);
        return response([
          trip('selected'),
          {
            ...trip('loaded'),
            'name': 'Trip 2',
            'status': 'ready',
            'statusLabel': 'Ready',
          },
        ]);
      }),
    );
    addTearDown(service.dispose);
    await tester.pumpWidget(MaterialApp(home: TripsScreen(service: service)));
    await tester.pumpAndSettle();
    expect(find.byType(TabBar), findsNothing);
    expect(find.text('VEH014 · Trip 1'), findsOneWidget);
    expect(find.text('VEH014 · Trip 2'), findsOneWidget);
    expect(find.text('Resend driver OTP'), findsOneWidget);
    await tester.tap(find.text('Start loading'));
    await tester.pumpAndSettle();
    expect(
      tester.widget<TripDetailScreen>(find.byType(TripDetailScreen)).tripId,
      'selected',
    );
    await tester.pumpWidget(const SizedBox());
  });
  testWidgets('refreshes and polls an empty combined list', (tester) async {
    var calls = 0;
    final service = TripService(
      client: MockClient((_) async {
        calls++;
        return response([], ready: calls);
      }),
    );
    addTearDown(service.dispose);
    await tester.pumpWidget(MaterialApp(home: TripsScreen(service: service)));
    await tester.pumpAndSettle();
    expect(find.text('No trips to load.'), findsOneWidget);
    await tester.drag(find.byType(ListView), const Offset(0, 350));
    await tester.pumpAndSettle();
    expect(calls, 2);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pumpAndSettle();
    final beforePoll = calls;
    await tester.pump(const Duration(seconds: 30));
    await tester.pumpAndSettle();
    expect(calls, beforePoll + 1);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('offers retry after an API failure', (tester) async {
    var calls = 0;
    final service = TripService(
      client: MockClient((_) async {
        if (++calls == 1) {
          return http.Response('{"message":"Trips unavailable"}', 503);
        }
        return response([]);
      }),
    );
    addTearDown(service.dispose);
    await tester.pumpWidget(MaterialApp(home: TripsScreen(service: service)));
    await tester.pumpAndSettle();
    expect(find.text('Trips unavailable'), findsOneWidget);
    await tester.tap(find.text('Retry'));
    await tester.pumpAndSettle();
    expect(find.text('No trips to load.'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });
}
