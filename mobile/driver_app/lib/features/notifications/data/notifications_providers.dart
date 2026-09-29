import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/presentation/auth_controller.dart';
import '../domain/app_notification.dart';
import 'mock_notifications_repository.dart';
import 'notifications_repository.dart';

final notificationsRepositoryProvider = Provider<NotificationsRepository>(
    (ref) => MockNotificationsRepository());

// Watches the signed-in driver so cached data never leaks across accounts.
final notificationsProvider = FutureProvider<List<AppNotification>>((ref) {
  ref.watch(authControllerProvider);
  return ref.watch(notificationsRepositoryProvider).getNotifications();
});
