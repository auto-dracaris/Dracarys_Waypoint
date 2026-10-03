import '../domain/app_notification.dart';
import 'notifications_repository.dart';

class MockNotificationsRepository implements NotificationsRepository {
  MockNotificationsRepository({
    this.latency = const Duration(milliseconds: 400),
    DateTime Function()? now,
  }) : _now = now ?? DateTime.now;

  final Duration latency;
  final DateTime Function() _now;

  @override
  Future<List<AppNotification>> getNotifications() async {
    await Future<void>.delayed(latency);
    final now = _now();
    final yesterday = DateTime(now.year, now.month, now.day - 1);
    return [
      AppNotification(
        id: 'n1',
        kind: NotificationKind.stopSequenceChanged,
        title: 'Trip 1 stop sequence updated',
        body: 'The dispatcher changed the delivery order. '
            'Review the latest sequence before departure.',
        createdAt: now.subtract(const Duration(minutes: 2)),
        severity: NotificationSeverity.error,
        tripId: 'trip-1',
        actionLabel: 'Review changes',
      ),
      AppNotification(
        id: 'n2',
        kind: NotificationKind.loadingStarted,
        title: 'Loading started for Trip 1',
        body: 'The loading team is preparing your 4 stops. '
            'Loading is still in progress.',
        createdAt: now.subtract(const Duration(minutes: 8)),
        severity: NotificationSeverity.warning,
        tripId: 'trip-1',
        actionLabel: 'View trip',
      ),
      AppNotification(
        id: 'n3',
        kind: NotificationKind.tripAssigned,
        title: 'Trip 2 assigned',
        body: 'Fresh deliveries · Gampaha',
        footnote: '2 stops · Planned departure 07:00 AM',
        createdAt:
            DateTime(yesterday.year, yesterday.month, yesterday.day, 17, 20),
        severity: NotificationSeverity.info,
        tripId: 'trip-2',
        actionLabel: 'View trip',
      ),
      AppNotification(
        id: 'n4',
        kind: NotificationKind.savedOffline,
        title: 'Latest trip saved offline',
        body: 'Trip 2 details are available on this device without a connection.',
        footnote: 'Map availability depends on downloaded map data.',
        createdAt:
            DateTime(yesterday.year, yesterday.month, yesterday.day, 17, 15),
        severity: NotificationSeverity.success,
      ),
    ];
  }
}
