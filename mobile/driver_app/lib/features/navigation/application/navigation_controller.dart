import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';

import '../../../core/api/api_config.dart' show demoSpeedKmh;

import '../data/location_source.dart';
import '../data/simulated_location_source.dart';

enum NavPhase { idle, navigating, arrived }

class NavState {
  const NavState({
    this.phase = NavPhase.idle,
    this.position,
    this.totalMeters = 0,
  });

  final NavPhase phase;
  final VehiclePosition? position;
  final double totalMeters;

  /// 0 at the start of the route, 1 on arrival.
  double get progress => totalMeters == 0 || position == null
      ? 0
      : 1 - position!.remainingMeters / totalMeters;
}

/// Swap for a real GPS/backend source when one exists.
final locationSourceProvider =
    Provider<LocationSource>(
      (_) => const SimulatedLocationSource(speedKmh: demoSpeedKmh),
    );

class NavigationController extends Notifier<NavState> {
  StreamSubscription<VehiclePosition>? _sub;

  @override
  NavState build() {
    ref.onDispose(() => _sub?.cancel());
    return const NavState();
  }

  void start(List<LatLng> route) {
    if (state.phase == NavPhase.navigating) return;
    final total = PolylineWalker(route).totalMeters;
    _sub?.cancel();
    state = NavState(phase: NavPhase.navigating, totalMeters: total);
    _sub = ref.read(locationSourceProvider).follow(route).listen(
          (p) => state = NavState(
              phase: NavPhase.navigating, position: p, totalMeters: total),
          onDone: () => state = NavState(
              phase: NavPhase.arrived,
              position: state.position,
              totalMeters: total),
        );
  }

  void end() {
    _sub?.cancel();
    _sub = null;
    state = const NavState();
  }
}

final navigationProvider =
    NotifierProvider.autoDispose<NavigationController, NavState>(
        NavigationController.new);
