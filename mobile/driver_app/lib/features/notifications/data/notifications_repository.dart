import '../domain/app_notification.dart';

abstract interface class NotificationsRepository {
  /// Newest first.
  Future<List<AppNotification>> getNotifications();
}
