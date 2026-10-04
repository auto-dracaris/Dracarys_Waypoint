import 'package:flutter/material.dart';
import 'package:flutter_application/screens/load_confirm_screen.dart';
import 'package:flutter_application/screens/report_issue_screen.dart';
import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_application/models/trip.dart';
import 'package:flutter_application/services/auth_service.dart';
import 'package:flutter_application/services/trip_service.dart';
import 'package:flutter_application/services/issue_service.dart';

void main() {
  setUp(
    () => SharedPreferences.setMockInitialValues({
      AuthService.sessionKey: jsonEncode({
        'accessToken': 'old',
        'refreshToken': 'refresh',
        'user': {'role': 'loader'},
      }),
    }),
  );

  test(
    'concurrent unauthorized requests share one refresh and retry with the new token',
    () async {
      var refreshes = 0;
      final auth = AuthService(
        client: MockClient((request) async {
          if (request.url.path.endsWith('/auth/refresh')) {
            refreshes++;
            await Future<void>.delayed(const Duration(milliseconds: 20));
            return http.Response(
              jsonEncode({
                'data': {
                  'accessToken': 'new',
                  'refreshToken': 'rotated',
                  'user': {'role': 'loader'},
                },
              }),
              200,
            );
          }
          return http.Response(
            '{}',
            request.headers['Authorization'] == 'Bearer new' ? 200 : 401,
          );
        }),
      );
      final responses = await Future.wait([
        auth.authenticatedRequest('/trips'),
        auth.authenticatedRequest('/issues'),
      ]);
      expect(
        responses.map((response) => response.statusCode),
        everyElement(200),
      );
      expect(refreshes, 1);
      expect(
        jsonDecode(
          (await SharedPreferences.getInstance()).getString(
            AuthService.sessionKey,
          )!,
        )['refreshToken'],
        'rotated',
      );
      auth.dispose();
    },
  );

  test(
    'expired saved access token restores its session with the refresh token',
    () async {
      final payload = base64Url.encode(utf8.encode(jsonEncode({'exp': 1})));
      SharedPreferences.setMockInitialValues({
        AuthService.sessionKey: jsonEncode({
          'accessToken': 'header.$payload.signature',
          'refreshToken': 'refresh',
          'user': {'role': 'loader'},
        }),
      });
      final auth = AuthService(
        client: MockClient((request) async {
          expect(request.url.path, '/api/auth/refresh');
          return http.Response(
            jsonEncode({
              'data': {
                'accessToken': 'new',
                'refreshToken': 'rotated',
                'user': {'role': 'loader'},
              },
            }),
            200,
          );
        }),
      );
      expect(await auth.hasValidToken(), isTrue);
      auth.dispose();
    },
  );

  test(
    'repeated completion without a returned code does not rotate the driver code',
    () async {
      final paths = <String>[];
      final trips = TripService(
        client: MockClient((request) async {
          paths.add(request.url.path);
          return http.Response(
            jsonEncode({
              'data': request.url.path.endsWith('/complete')
                  ? {}
                  : {'dispatchCode': '0123'},
            }),
            200,
          );
        }),
      );
      expect(await trips.completeLoading('trip'), '');
      expect(paths, ['/api/trips/trip/loading/complete']);
      trips.dispose();
    },
  );

  test(
    'persisted progress distinguishes unconfirmed orders and approved zero counts',
    () {
      final stop = TripStop.fromJson({
        'id': '1',
        'name': 'Store',
        'sequence': 1,
        'orders': [
          {'id': 'ORD0000001', 'cases': 0, 'loadedCases': 0},
          {'id': 'ORD0000002', 'cases': 7, 'loadedCases': null},
        ],
      });
      expect(stop.confirmed, isFalse);
      expect(stop.orderCases, {'ORD0000001': 0, 'ORD0000002': 7});
      final confirmed = TripStop.fromJson({
        'id': '1',
        'name': 'Store',
        'sequence': 1,
        'orders': [
          {'id': 'ORD0000001', 'cases': 0, 'loadedCases': 0},
          {'id': 'ORD0000002', 'cases': 7, 'loadedCases': 7},
        ],
      });
      expect(confirmed.confirmed, isTrue);
    },
  );

  test(
    'recount resubmits the same issue with a PATCH rather than creating another',
    () async {
      final issues = IssueService(
        client: MockClient((request) async {
          expect(request.method, 'PATCH');
          expect(request.url.path, '/api/issues/existing');
          expect(jsonDecode(request.body), {
            'affectedCases': 3,
            'note': 'Recounted',
          });
          return http.Response(
            jsonEncode({
              'data': {
                'id': 'existing',
                'type': 'load_damage',
                'status': 'open',
                'affectedCases': 3,
              },
            }),
            200,
          );
        }),
      );
      final issue = await issues.resubmit('existing', 3, ' Recounted ');
      expect(issue.id, 'existing');
      expect(issue.status, 'open');
      issues.dispose();
    },
  );
  testWidgets('resume starts at the first unconfirmed stop in loading order', (
    tester,
  ) async {
    final data = {
      'id': 'trip',
      'name': 'Trip 1',
      'vehicle': {'plate': 'VEH1'},
      'subtitle': 'Deliveries',
      'statusLabel': 'In Progress',
      'status': 'loading',
      'planVersion': 2,
      'totalUnits': 12,
      'stopCount': 2,
      'stops': [
        {
          'id': '1',
          'sequence': 1,
          'name': 'First delivery',
          'orders': [
            {'id': 'ORD0000001', 'cases': 5, 'loadedCases': null},
          ],
        },
        {
          'id': '2',
          'sequence': 2,
          'name': 'Last delivery',
          'orders': [
            {'id': 'ORD0000002', 'cases': 7, 'loadedCases': 7},
          ],
        },
      ],
    };
    final service = TripService(
      client: MockClient(
        (_) async => http.Response(jsonEncode({'data': data}), 200),
      ),
    );
    await tester.pumpWidget(
      MaterialApp(
        home: LoadConfirmScreen(tripId: 'trip', service: service),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Load 2 of 2'), findsOneWidget);
    expect(find.text('For delivery Stop 1'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Loaded: 5 of 5 cases'), 150);
    expect(find.text('Loaded: 5 of 5 cases'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
    service.dispose();
  });

  testWidgets('multi-order issue reports the selected order', (tester) async {
    String? reportedOrder;
    final service = IssueService(
      client: MockClient((request) async {
        if (request.method == 'GET') {
          return http.Response(
            jsonEncode({
              'data': {
                'items': [],
                'meta': {'totalPages': 0},
              },
            }),
            200,
          );
        }
        final body = jsonDecode(request.body);
        reportedOrder = body['orderId'] as String;
        return http.Response(
          jsonEncode({
            'data': {
              'id': 'issue',
              'type': body['type'],
              'status': 'open',
              'affectedCases': body['affectedCases'],
            },
          }),
          201,
        );
      }),
    );
    await tester.pumpWidget(
      MaterialApp(
        home: ReportIssueScreen(
          tripId: 'trip',
          orderIds: const ['ORD0000001', 'ORD0000002'],
          orderCases: const {'ORD0000001': 5, 'ORD0000002': 7},
          service: service,
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byType(DropdownButtonFormField<String>));
    await tester.pumpAndSettle();
    await tester.tap(find.text('ORD0000002 · 7 cases').last);
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Send issue to dispatcher'));
    await tester.tap(find.text('Send issue to dispatcher'));
    await tester.pumpAndSettle();
    expect(reportedOrder, 'ORD0000002');
    await tester.pumpWidget(const SizedBox());
    service.dispose();
  });
}
