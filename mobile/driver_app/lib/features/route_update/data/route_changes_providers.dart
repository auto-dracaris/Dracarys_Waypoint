import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/demo_mode.dart';
import '../../../core/api/api_providers.dart';
import '../../../core/storage/offline_cache.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../sync/data/sync_providers.dart';
import '../domain/route_change.dart';
import 'http_route_changes_repository.dart';
import 'mock_route_changes_repository.dart';
import 'route_changes_repository.dart';

final routeChangesRepositoryProvider = Provider<RouteChangesRepository>((ref) {
  if (ref.watch(demoModeProvider)) return MockRouteChangesRepository();
  return HttpRouteChangesRepository(
    ref.watch(apiClientProvider),
    cache: ref.watch(offlineCacheProvider),
    submitter: ref.watch(actionSubmitterProvider),
    queue: ref.watch(actionQueueProvider),
  );
});

/// True while the dispatcher has changed this trip's plan and the driver has
/// not yet reviewed it: stops are held until they have, since the server would
/// refuse actions against the old plan.
final routeUpdatePendingProvider = Provider.family<bool, String>(
  (ref, tripId) =>
      ref.watch(routeChangeProvider(tripId)).value?.acknowledged == false,
);

/// The trip's route change, or null when there is none.
final routeChangeProvider = FutureProvider.family<RouteChange?, String>((
  ref,
  tripId,
) {
  ref.watch(authControllerProvider);
  return ref.watch(routeChangesRepositoryProvider).get(tripId);
});
