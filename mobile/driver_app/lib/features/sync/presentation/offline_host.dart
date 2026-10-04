import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';

import '../../../core/demo_mode.dart';
import '../../../core/connectivity/online_provider.dart';
import '../../../core/widgets/map_view.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../navigation/data/offline_map_service.dart';
import '../../trips/data/trips_providers.dart';
import '../../trips/domain/trip.dart';
import '../application/sync_service.dart';

/// Sits above the whole app and keeps the offline machinery running: starts the
/// sync service (so queued actions are sent without any screen asking), tries
/// again whenever the app returns to the foreground, and downloads the map for
/// each trip while there is a connection.
class OfflineHost extends ConsumerStatefulWidget {
  const OfflineHost({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<OfflineHost> createState() => _OfflineHostState();
}

class _OfflineHostState extends ConsumerState<OfflineHost>
    with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      ref.read(syncServiceProvider.notifier).kick();
    }
  }

  void _prefetchMaps(List<Trip> trips) {
    if (ref.read(demoModeProvider) || !ref.read(mapTilesEnabledProvider)) return;
    if (!ref.read(onlineProvider)) return;
    final driver = ref.read(authControllerProvider).value;
    final depot = driver?.depotLat != null && driver?.depotLng != null
        ? LatLng(driver!.depotLat!, driver.depotLng!)
        : null;
    final service = ref.read(offlineMapServiceProvider);
    for (final trip in trips) {
      if (trip.status == TripStatus.completed || trip.stops.isEmpty) continue;
      service.ensureRegion(
        key: 'trip:${trip.id}',
        points: [?depot, for (final s in trip.stops) LatLng(s.lat, s.lng)],
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    // Watching starts the service and keeps it alive for the whole session.
    ref.watch(syncServiceProvider);
    ref.listen(tripsProvider, (_, next) {
      final trips = next.value;
      if (trips != null) _prefetchMaps(trips);
    });
    return widget.child;
  }
}
