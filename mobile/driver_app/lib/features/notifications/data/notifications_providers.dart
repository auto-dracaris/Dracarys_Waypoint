import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/demo_mode.dart';
import '../../../core/clock.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../route_update/data/route_changes_providers.dart';
import '../../trips/data/trips_providers.dart';
import '../domain/app_notification.dart';
import 'derived_notifications_repository.dart';
import 'mock_notifications_repository.dart';
import 'notifications_repository.dart';

final notificationsRepositoryProvider = Provider<NotificationsRepository>((
  ref,
) {
  if (ref.watch(demoModeProvider)) return MockNotificationsRepository();
  return DerivedNotificationsRepository(
    ref.watch(tripsRepositoryProvider),
    ref.watch(routeChangesRepositoryProvider),
    now: ref.watch(clockProvider),
  );
});

// Watches the signed-in driver so cached data never leaks across accounts.
final notificationsProvider = FutureProvider<List<AppNotification>>((ref) {
  ref.watch(authControllerProvider);
  return ref.watch(notificationsRepositoryProvider).getNotifications();
});
