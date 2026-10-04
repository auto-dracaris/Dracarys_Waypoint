import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/trip.dart';
import 'auth_service.dart';

class TripService {
  final http.Client _client;
  final String _baseUrl;
  TripService({http.Client? client, String? baseUrl})
    : _client = client ?? http.Client(),
      _baseUrl = (baseUrl ?? AuthService.defaultBaseUrl).replaceFirst(
        RegExp(r'/+$'),
        '',
      );

  Future<Map<String, dynamic>> _get(
    String path, {
    bool post = false,
    Map<String, dynamic>? body,
  }) async {
    final response = await AuthService(
      client: _client,
      baseUrl: _baseUrl,
    ).authenticatedRequest(path, method: post ? 'POST' : 'GET', body: body);
    final envelope = jsonDecode(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw StateError(
        envelope['message']?.toString() ?? 'Could not load trips.',
      );
    }
    return envelope['data'] as Map<String, dynamic>;
  }

  Future<TripListResult> getTrips({
    TripListStatus? status = TripListStatus.readyToLoad,
    String? date,
  }) async {
    final trips = <TripSummary>[];
    var counts = const TripTabCounts();
    var page = 1;
    int totalPages;
    do {
      final filter = status == null ? '' : 'status=${status.apiValue}&';
      final day = date == null ? '' : 'date=${Uri.encodeQueryComponent(date)}&';
      final data = await _get('/trips?$filter${day}page=$page');
      counts = TripTabCounts.fromJson(
        data['meta']['counts'] as Map<String, dynamic>,
      );
      trips.addAll(
        (data['items'] as List).map(
          (item) => TripSummary.fromJson(item as Map<String, dynamic>),
        ),
      );
      totalPages = data['meta']['totalPages'] as int;
      page++;
    } while (page <= totalPages);
    return TripListResult(trips: trips, counts: counts);
  }

  static String todayServiceDate({DateTime? now}) {
    final colombo = (now ?? DateTime.now()).toUtc().add(
      const Duration(hours: 5, minutes: 30),
    );
    final today = DateTime.utc(colombo.year, colombo.month, colombo.day);
    return today.toIso8601String().substring(0, 10);
  }

  static String tomorrowServiceDate({DateTime? now}) {
    final colombo = (now ?? DateTime.now()).toUtc().add(
      const Duration(hours: 5, minutes: 30),
    );
    final tomorrow = DateTime.utc(colombo.year, colombo.month, colombo.day + 1);
    return tomorrow.toIso8601String().substring(0, 10);
  }

  // The existing API stores completion at trip level. Order checks in live
  // mode are a device-local checklist, scoped to the account and current plan.
  Future<String> _checklistKey(String id) async {
    final preferences = await SharedPreferences.getInstance();
    final raw = preferences.getString(AuthService.sessionKey);
    final user = raw == null ? null : jsonDecode(raw)['user'];
    return 'loader.checklist.${Uri.encodeComponent(_baseUrl)}.${user?['id'] ?? user?['phone'] ?? 'session'}.$id';
  }

  String _planSignature(Map<String, dynamic> data) => jsonEncode({
    'version': data['planVersion'],
    'stops': [
      for (final stop in data['stops'] as List)
        {
          'id': stop['id'],
          'sequence': stop['sequence'],
          'orders': [
            for (final order in stop['orders'] as List)
              {'id': order['id'], 'cases': order['cases']},
          ],
        },
    ],
  });

  Future<TripDetail> _withChecklist(
    String id,
    Map<String, dynamic> data,
  ) async {
    final preferences = await SharedPreferences.getInstance();
    final raw = preferences.getString(await _checklistKey(id));
    if (raw != null) {
      final checklist = jsonDecode(raw);
      if (checklist['plan'] == _planSignature(data)) {
        final confirmed = checklist['orders'] as Map;
        for (final stop in data['stops'] as List) {
          for (final order in stop['orders'] as List) {
            if (confirmed[order['id']] == order['cases']) {
              order['loadedCases'] = order['cases'];
            }
          }
        }
      }
    }
    return TripDetail.fromJson(data);
  }

  Future<TripDetail> getTripById(String id) async =>
      _withChecklist(id, await _get('/trips/${Uri.encodeComponent(id)}'));
  void dispose() => _client.close();
  Future<TripDetail> startLoading(String id) async => TripDetail.fromJson(
    await _get('/trips/${Uri.encodeComponent(id)}/loading/start', post: true),
  );

  Future<TripDetail> confirmOrder(
    String tripId,
    String orderId,
    int cases,
    int version,
  ) async {
    final data = await _get('/trips/${Uri.encodeComponent(tripId)}');
    if (data['planVersion'] != version || data['status'] != 'loading') {
      throw StateError('The loading plan changed. Refresh before confirming.');
    }
    final orders = [
      for (final stop in data['stops'] as List) ...stop['orders'] as List,
    ];
    if (!orders.any(
      (order) => order['id'] == orderId && order['cases'] == cases,
    )) {
      throw StateError(
        'The order quantity changed. Refresh before confirming.',
      );
    }
    final preferences = await SharedPreferences.getInstance();
    final key = await _checklistKey(tripId);
    final raw = preferences.getString(key);
    final previous = raw == null ? null : jsonDecode(raw);
    final plan = _planSignature(data);
    final confirmed = previous?['plan'] == plan
        ? Map<String, dynamic>.from(previous['orders'])
        : <String, dynamic>{};
    confirmed[orderId] = cases;
    if (!await preferences.setString(
      key,
      jsonEncode({'plan': plan, 'orders': confirmed}),
    )) {
      throw StateError('Could not save the loading checklist. Please retry.');
    }
    return _withChecklist(tripId, data);
  }

  Future<String> recoverCode(String id) async {
    await resendDriverCode(id);
    return '';
  }

  Future<String> completeLoading(String id) async {
    await finishLoading(id);
    return '';
  }

  // Completion is trip-level. A repeated completion need not return a code.
  Future<void> finishLoading(String id) async {
    await _get(
      '/trips/${Uri.encodeComponent(id)}/loading/complete',
      post: true,
    );
  }

  Future<void> resendDriverCode(String id) async {
    await _get('/trips/${Uri.encodeComponent(id)}/loading/code', post: true);
  }
}
