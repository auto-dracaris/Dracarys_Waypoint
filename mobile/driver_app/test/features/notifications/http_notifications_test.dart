import 'package:driver_app/features/notifications/application/push_registrar.dart';
import 'package:driver_app/features/notifications/data/http_notifications_repository.dart';
import 'package:driver_app/features/notifications/domain/app_notification.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('a route change becomes an error card that opens the review', () {
    final n = notificationFromJson({
      'id': 'a1',
      'type': 'route_changed',
      'severity': 'error',
      'title': 'Trip 1 stop order changed',
      'body': 'Road closure.',
      'data': {'tripId': 't-9'},
      'read': false,
      'createdAt': '2026-10-05T03:12:00.000Z',
    });
    expect(n.kind, NotificationKind.stopSequenceChanged);
    expect(n.severity, NotificationSeverity.error);
    expect(n.tripId, 't-9');
    expect(n.read, isFalse);
    expect(n.actionLabel, 'Review changes');
  });

  test('an unknown type still shows its words and has no action', () {
    final n = notificationFromJson({
      'id': 'a2',
      'type': 'something_new',
      'severity': 'info',
      'title': 'Hello',
      'body': 'World',
      'data': <String, dynamic>{},
      'read': true,
      'createdAt': '2026-10-05T03:12:00.000Z',
    });
    expect(n.kind, NotificationKind.general);
    expect(n.title, 'Hello');
    expect(n.actionLabel, isNull);
  });

  test('a tapped push opens the matching screen', () {
    expect(
      pushDestination({'type': 'route_changed', 'tripId': 't1'}),
      '/updates/route-update/t1',
    );
    expect(
      pushDestination({'type': 'trip_ready', 'tripId': 't1'}),
      '/trips/trip/t1',
    );
    expect(pushDestination({'type': 'issue_resolved'}), '/updates');
    expect(pushDestination({}), '/updates');
  });
}
