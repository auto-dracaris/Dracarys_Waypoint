import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/presentation/auth_controller.dart';
import '../domain/route_change.dart';
import 'mock_route_changes_repository.dart';
import 'route_changes_repository.dart';

final routeChangesRepositoryProvider = Provider<RouteChangesRepository>(
    (ref) => MockRouteChangesRepository());

/// The trip's route change, or null when there is none.
final routeChangeProvider =
    FutureProvider.family<RouteChange?, String>((ref, tripId) {
  ref.watch(authControllerProvider);
  return ref.watch(routeChangesRepositoryProvider).get(tripId);
});
