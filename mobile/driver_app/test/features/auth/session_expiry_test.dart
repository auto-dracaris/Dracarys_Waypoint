import 'dart:convert';

import 'package:driver_app/app.dart';
import 'package:driver_app/core/api/api_client.dart';
import 'package:driver_app/core/api/api_providers.dart';
import 'package:driver_app/core/api/token_store.dart';
import 'package:driver_app/core/router/app_router.dart';
import 'package:driver_app/features/auth/presentation/auth_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

http.Response envelope(int status, String message) => http.Response(
    jsonEncode({'statusCode': status, 'message': message, 'data': null}),
    status,
    headers: {'content-type': 'application/json'});

void main() {
  testWidgets(
      'a stored session the API rejects (access and refresh) lands on sign-in',
      (tester) async {
    final tokens = InMemoryTokenStore(access: 'old', refresh: 'dead');
    await tester.pumpWidget(ProviderScope(
      overrides: [
        tokenStoreProvider.overrideWithValue(tokens),
        apiClientProvider.overrideWith((ref) => ApiClient(
              baseUrl: 'http://api.test/api',
              tokens: tokens,
              client: MockClient((_) async => envelope(401, 'Unauthorized')),
              onSignedOut: () => ref.invalidate(authControllerProvider),
            )),
        splashDurationProvider.overrideWithValue(Duration.zero),
      ],
      child: const WaypointDriverApp(),
    ));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('login-submit')), findsOneWidget);
    expect(await tokens.readAccess(), isNull);
    expect(await tokens.readRefresh(), isNull);
  });
}
