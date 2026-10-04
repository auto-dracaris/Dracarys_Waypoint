import '../../../core/api/api_client.dart';
import '../../../core/api/api_exception.dart';
import '../domain/app_notification.dart';
import 'notifications_repository.dart';

/// The driver's notifications from `GET /notifications`, newest first.
class HttpNotificationsRepository implements NotificationsRepository {
  HttpNotificationsRepository(this._api);

  final ApiClient _api;

  @override
  Future<List<AppNotification>> getNotifications() async {
    final data = await _api.get('/notifications', query: {'limit': '50'});
    final items = data is Map ? data['items'] : null;
    if (items is! List) return const [];
    return [
      for (final j in items)
        if (j is Map<String, dynamic>) notificationFromJson(j),
    ];
  }

  /// Safe to repeat; a failure is not worth bothering the driver about.
  Future<void> markRead(String id) async {
    try {
      await _api.post('/notifications/$id/read');
    } on ApiException {
      // It will be offered again next time the list loads.
    }
  }
}

/// Shows the server's list; with no connection (or a failing server) the
/// phone's own list, built from the saved trips, so the tab is never empty
/// just because the signal is gone.
class FallbackNotificationsRepository implements NotificationsRepository {
  FallbackNotificationsRepository(this._primary, this._fallback);

  final NotificationsRepository _primary;
  final NotificationsRepository _fallback;

  @override
  Future<List<AppNotification>> getNotifications() async {
    try {
      return await _primary.getNotifications();
    } on ApiException {
      return _fallback.getNotifications();
    }
  }
}

/// Maps one server notification. An unknown `type` still shows its title and
/// body (as [NotificationKind.general]) so a new server type cannot break an
/// older app.
AppNotification notificationFromJson(Map<String, dynamic> j) {
  final type = '${j['type']}';
  final data = j['data'] is Map ? (j['data'] as Map) : const {};
  final tripId = data['tripId'] == null ? null : '${data['tripId']}';
  return AppNotification(
    id: '${j['id']}',
    type: type,
    kind: switch (type) {
      'trip_assigned' => NotificationKind.tripAssigned,
      'trip_ready' => NotificationKind.tripReady,
      'route_changed' => NotificationKind.stopSequenceChanged,
      'issue_acknowledged' || 'issue_resolved' => NotificationKind.issueUpdate,
      _ => NotificationKind.general,
    },
    title: '${j['title']}',
    body: '${j['body']}',
    createdAt:
        DateTime.tryParse('${j['createdAt']}')?.toLocal() ?? DateTime.now(),
    severity: switch (j['severity']) {
      'error' => NotificationSeverity.error,
      'warning' => NotificationSeverity.warning,
      'success' => NotificationSeverity.success,
      _ => NotificationSeverity.info,
    },
    tripId: tripId,
    read: j['read'] == true,
    actionLabel: switch (type) {
      'route_changed' => 'Review changes',
      'trip_assigned' || 'trip_ready' => tripId == null ? null : 'View trip',
      _ => null,
    },
  );
}
