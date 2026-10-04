import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/issue.dart';
import 'auth_service.dart';

class IssueService {
  final http.Client _client;
  final String _baseUrl;
  IssueService({http.Client? client, String? baseUrl})
    : _client = client ?? http.Client(),
      _baseUrl = (baseUrl ?? AuthService.defaultBaseUrl).replaceFirst(
        RegExp(r'/+$'),
        '',
      );

  Future<dynamic> _request(
    String path, {
    Map<String, dynamic>? body,
    String? method,
  }) async {
    final response = await AuthService(client: _client, baseUrl: _baseUrl)
        .authenticatedRequest(
          path,
          method: method ?? (body == null ? 'GET' : 'POST'),
          body: body,
        );
    final envelope = jsonDecode(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final message = envelope['message'];
      throw StateError(
        message is List
            ? message.join('\n')
            : message?.toString() ?? 'Could not update issue.',
      );
    }
    return envelope['data'];
  }

  Future<Issue> reportIssue({
    required String tripId,
    required String orderId,
    required IssueType type,
    required int affectedCases,
    required String note,
  }) async => Issue.fromJson(
    await _request(
          '/issues',
          body: {
            'tripId': tripId,
            'orderId': orderId,
            'type': type.name,
            'affectedCases': affectedCases,
            'note': note.trim(),
          },
        )
        as Map<String, dynamic>,
  );

  Future<List<Issue>> getIssues(String tripId) async {
    final issues = <Issue>[];
    var page = 1;
    int totalPages;
    do {
      final data = await _request(
        '/issues?tripId=${Uri.encodeComponent(tripId)}&page=$page',
      );
      issues.addAll(
        (data['items'] as List)
            .where(
              (item) =>
                  IssueType.values.any((type) => type.name == item['type']),
            )
            .map((item) => Issue.fromJson(item as Map<String, dynamic>)),
      );
      totalPages = (data['meta']['totalPages'] as num).toInt();
      page++;
    } while (page <= totalPages);
    return issues;
  }

  Future<Issue> getIssue(String id) async => Issue.fromJson(
    await _request('/issues/${Uri.encodeComponent(id)}')
        as Map<String, dynamic>,
  );

  Future<Issue> resubmit(String id, int cases, String note) async =>
      Issue.fromJson(
        await _request(
              '/issues/${Uri.encodeComponent(id)}',
              method: 'PATCH',
              body: {'affectedCases': cases, 'note': note.trim()},
            )
            as Map<String, dynamic>,
      );

  void dispose() => _client.close();
}
