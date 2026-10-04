import 'dart:convert';

import 'package:driver_app/core/api/api_client.dart';
import 'package:driver_app/core/api/token_store.dart';
import 'package:driver_app/core/storage/local_store.dart';
import 'package:driver_app/core/storage/offline_cache.dart';
import 'package:driver_app/features/sync/data/action_executor.dart';
import 'package:driver_app/features/sync/data/action_queue.dart';
import 'package:driver_app/features/sync/data/action_submitter.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

http.Response envelope(int status, String message, [Object? data]) =>
    http.Response(
      jsonEncode({'statusCode': status, 'message': message, 'data': data}),
      status,
      headers: {'content-type': 'application/json'},
    );

/// Everything the offline machinery runs on, over a fake network with an
/// on/off switch: the API client, local storage, cache, action queue and
/// submitter. [online] is both what the fake network does (when false every
/// request dies like a dropped signal) and what the submitter believes.
class OfflineHarness {
  OfflineHarness([http.Response Function(http.Request)? respond])
    : respond = respond ?? ((_) => envelope(200, 'ok')) {
    api = ApiClient(
      baseUrl: 'http://api.test/api',
      tokens: InMemoryTokenStore(access: 'A1', refresh: 'R1'),
      client: MockClient((req) async {
        sent.add(req);
        if (!online) throw http.ClientException('no signal');
        return this.respond(req);
      }),
      onReachability: (ok) => reachability.add(ok),
    );
    cache = OfflineCache(store);
    queue = ActionQueue(store);
    executor = ActionExecutor(api, store);
    submitter = ActionSubmitter(
      queue: queue,
      executor: executor,
      store: store,
      isOnline: () => online,
      onQueued: () => queuedCount++,
      now: () => DateTime.utc(2026, 10, 4, 3, 0),
    );
  }

  http.Response Function(http.Request) respond;
  bool online = true;
  int queuedCount = 0;

  final store = MemoryLocalStore();
  final sent = <http.Request>[];
  final reachability = <bool>[];

  late final ApiClient api;
  late final OfflineCache cache;
  late final ActionQueue queue;
  late final ActionExecutor executor;
  late final ActionSubmitter submitter;

  Iterable<http.Request> get posts => sent.where((r) => r.method == 'POST');
}
