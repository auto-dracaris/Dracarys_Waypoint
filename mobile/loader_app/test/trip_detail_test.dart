import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_application/services/auth_service.dart';
import 'package:flutter_application/services/trip_service.dart';
import 'package:flutter_application/screens/trips_detail_screen.dart';

void main() {
  testWidgets(
    'fetches selected manifest, sums order cases, and reverses stops',
    (tester) async {
      SharedPreferences.setMockInitialValues({
        AuthService.sessionKey: '{"accessToken":"test-token"}',
      });
      final service = TripService(
        client: MockClient((request) async {
          expect(request.url.path, '/api/trips/selected-trip');
          expect(request.headers['Authorization'], 'Bearer test-token');
          return http.Response(
            jsonEncode({
              'data': {
                'id': 'selected-trip',
                'name': 'Trip 7',
                'vehicle': {'plate': 'VEH999'},
                'subtitle': 'Fresh deliveries',
                'statusLabel': 'Ready to Load',
                'planVersion': 8,
                'totalUnits': 11,
                'stopCount': 2,
                'departure': '07:10',
                'stops': [
                  {
                    'id': '1',
                    'sequence': 1,
                    'name': 'First outlet',
                    'orders': [
                      {'cases': 3},
                      {'cases': 2},
                    ],
                  },
                  {
                    'id': '2',
                    'sequence': 2,
                    'name': 'Last outlet',
                    'orders': [
                      {'cases': 6},
                    ],
                  },
                ],
              },
            }),
            200,
          );
        }),
      );
      await tester.pumpWidget(
        MaterialApp(
          home: TripDetailScreen(tripId: 'selected-trip', service: service),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('VEH999 · Trip 7'), findsOneWidget);
      expect(find.textContaining('Plan v8 · Synced'), findsOneWidget);
      expect(find.text('2 stops · 11 cases · Depart 07:10'), findsOneWidget);
      expect(find.text('First outlet · 5 cases'), findsOneWidget);
      expect(find.text('Last outlet · 6 cases'), findsOneWidget);
      expect(
        tester.getTopLeft(find.text('Load 1 · Stop 2')).dy,
        lessThan(tester.getTopLeft(find.text('Load 2 · Stop 1')).dy),
      );
      service.dispose();
    },
  );
}
