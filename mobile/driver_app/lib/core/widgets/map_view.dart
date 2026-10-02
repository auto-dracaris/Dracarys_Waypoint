import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';

import '../theme/app_colors.dart';

/// Whether to load OpenStreetMap tiles. Tests turn this off (no network).
final mapTilesEnabledProvider = Provider<bool>((ref) => true);

class MapMarker {
  const MapMarker({
    required this.point,
    required this.child,
    this.width = 40,
    this.height = 40,
  });

  final LatLng point;
  final Widget child;
  final double width;
  final double height;
}

/// OpenStreetMap-based map with optional markers and a route line.
class MapView extends ConsumerWidget {
  const MapView({
    super.key,
    required this.center,
    this.zoom = 12,
    this.markers = const [],
    this.route = const [],
    this.fit = const [],
    this.fitPadding = const EdgeInsets.all(56),
  });

  final LatLng center;
  final double zoom;
  final List<MapMarker> markers;
  final List<LatLng> route;

  /// If given (2+ points), the camera starts framing all of them.
  final List<LatLng> fit;

  /// Space kept clear around the fitted points, e.g. for overlays on the map.
  final EdgeInsets fitPadding;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tiles = ref.watch(mapTilesEnabledProvider);
    return ClipRect(
      child: FlutterMap(
        options: MapOptions(
          initialCenter: center,
          initialZoom: zoom,
          initialCameraFit: fit.length > 1
              ? CameraFit.coordinates(
                  coordinates: fit, padding: fitPadding)
              : null,
          interactionOptions: const InteractionOptions(
            flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
          ),
        ),
        children: [
          if (tiles)
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.dracarys.driver_app',
            ),
          if (route.length > 1)
            PolylineLayer(polylines: [
              Polyline(
                points: route,
                strokeWidth: 6,
                color: AppColors.mapRoute,
              ),
            ]),
          MarkerLayer(markers: [
            for (final m in markers)
              Marker(
                point: m.point,
                width: m.width,
                height: m.height,
                child: m.child,
              ),
          ]),
          if (tiles)
            const SimpleAttributionWidget(
              source: Text('OpenStreetMap contributors'),
            ),
        ],
      ),
    );
  }
}
