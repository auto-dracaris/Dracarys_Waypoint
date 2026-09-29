import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../domain/app_notification.dart';
import 'mock_notifications_repository.dart';
import 'notifications_repository.dart';

final notificationsRepositoryProvider = Provider<NotificationsRepository>(
    (ref) => MockNotificationsRepository());

final notificationsProvider = FutureProvider<List<AppNotification>>(
    (ref) => ref.watch(notificationsRepositoryProvider).getNotifications());
