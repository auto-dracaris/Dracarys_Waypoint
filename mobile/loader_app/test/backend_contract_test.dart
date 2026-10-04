import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_application/services/auth_service.dart';
import 'package:flutter_application/services/trip_service.dart';
import 'package:flutter_application/services/issue_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(
    () => SharedPreferences.setMockInitialValues({
      AuthService.sessionKey: jsonEncode({
        'accessToken': 'test',
        'user': {'id': 7, 'role': 'loader'},
      }),
    }),
  );

  test(
    'live order checks persist locally and invalidate on plan changes',
    () async {
      var version = 1;
      final paths = <String>[];
      final service = TripService(
        client: MockClient((request) async {
          paths.add(request.url.path);
          expect(request.method, 'GET');
          return http.Response(
            jsonEncode({
              'data': {
                'id': 'trip',
                'name': 'Trip 1',
                'vehicle': {'plate': 'VEH1'},
                'subtitle': 'Deliveries',
                'statusLabel': 'Loading',
                'status': 'loading',
                'planVersion': version,
                'totalUnits': 5,
                'stopCount': 1,
                'stops': [
                  {
                    'id': '1',
                    'name': 'Store',
                    'sequence': 1,
                    'orders': [
                      {'id': 'ORD0000001', 'cases': 5},
                    ],
                  },
                ],
              },
            }),
            200,
          );
        }),
      );
      addTearDown(service.dispose);
      expect(
        (await service.confirmOrder(
          'trip',
          'ORD0000001',
          5,
          1,
        )).stops.single.confirmed,
        isTrue,
      );
      expect(
        (await service.getTripById('trip')).stops.single.confirmed,
        isTrue,
      );
      version = 2;
      expect(
        (await service.getTripById('trip')).stops.single.confirmed,
        isFalse,
      );
      await expectLater(
        service.confirmOrder('trip', 'ORD0000001', 5, 1),
        throwsStateError,
      );
      expect(paths, everyElement('/api/trips/trip'));
    },
  );

  test(
    'trip completion succeeds without code; resend is an explicit action',
    () async {
      final paths = <String>[];
      final service = TripService(
        client: MockClient((request) async {
          paths.add(request.url.path);
          expect(request.method, 'POST');
          expect(request.body, isEmpty);
          return http.Response('{"data":{}}', 200);
        }),
      );
      addTearDown(service.dispose);
      await service.finishLoading('trip');
      expect(paths, ['/api/trips/trip/loading/complete']);
      await service.resendDriverCode('trip');
      expect(paths.last, '/api/trips/trip/loading/code');
      expect(paths.any((path) => path.contains('/loading/orders/')), isFalse);
    },
  );

  test('unfiltered list includes loaded trips across pages', () async {
    final service = TripService(
      client: MockClient((request) async {
        expect(request.url.queryParameters.containsKey('status'), isFalse);
        final page = int.parse(request.url.queryParameters['page']!);
        return http.Response(
          jsonEncode({
            'data': {
              'items': [
                {
                  'id': '$page',
                  'name': 'Trip $page',
                  'vehicle': {'plate': 'VEH001'},
                  'subtitle': 'Deliveries',
                  'statusLabel': 'Ready',
                  'status': 'ready',
                  'planVersion': 1,
                  'totalUnits': 5,
                  'stopCount': 1,
                },
              ],
              'meta': {
                'totalPages': 2,
                'counts': {
                  'readyToLoad': 0,
                  'inProgress': 0,
                  'awaitingPlan': 0,
                },
              },
            },
          }),
          200,
        );
      }),
    );
    addTearDown(service.dispose);
    final result = await service.getTrips(status: null);
    expect(result.trips.map((trip) => trip.id), ['1', '2']);
    expect(result.trips.every((trip) => trip.status == 'ready'), isTrue);
  });

  test(
    'restoration includes same-depot reports supported by backend read access',
    () async {
      final service = IssueService(
        client: MockClient(
          (_) async => http.Response(
            jsonEncode({
              'data': {
                'items': [
                  for (final id in [7, 8])
                    {
                      'id': 'issue-$id',
                      'type': 'load_shortfall',
                      'status': 'open',
                      'affectedCases': 2,
                      'reportedBy': {'id': id},
                      'order': {'reference': 'ORD0000001', 'cases': 10},
                    },
                ],
                'meta': {'totalPages': 1},
              },
            }),
            200,
          ),
        ),
      );
      addTearDown(service.dispose);
      final issues = await service.getIssues('trip');
      expect(issues.map((issue) => issue.id), ['issue-7', 'issue-8']);
      expect(issues.first.plannedCases, 10);
    },
  );
}
