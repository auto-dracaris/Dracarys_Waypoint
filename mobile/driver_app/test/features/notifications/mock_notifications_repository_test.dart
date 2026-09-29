import 'package:driver_app/features/notifications/data/mock_notifications_repository.dart';
import 'package:driver_app/features/notifications/domain/app_notification.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('seeds the four Figma cards, newest first', () async {
    final repo = MockNotificationsRepository(
        latency: Duration.zero, now: () => DateTime(2026, 9, 29, 9, 0));
    final list = await repo.getNotifications();

    expect(list.length, 4);
    expect(list.first.severity, NotificationSeverity.error);
    expect(list.first.title, 'Trip 1 stop sequence updated');
    expect(list.first.actionLabel, 'Review changes');
    expect(
        list.where((n) => n.severity == NotificationSeverity.error).length, 1);

    for (var i = 1; i < list.length; i++) {
      expect(list[i].createdAt.isBefore(list[i - 1].createdAt), isTrue);
    }
  });
}
