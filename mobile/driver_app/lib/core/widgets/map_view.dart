import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';
import 'package:maplibre/maplibre.dart' as ml;

import '../theme/app_colors.dart';
import 'map_style.dart';

/// Whether to load the map (vector tiles). Tests turn this off (no network).
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

ml.Geographic _geo(LatLng p) => ml.Geographic(lon: p.longitude, lat: p.latitude);

/// MapLibre vector map with optional markers and a route line.
class MapView extends ConsumerStatefulWidget {
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
  ConsumerState<MapView> createState() => _MapViewState();
}

class _MapViewState extends ConsumerState<MapView> {
  ml.MapController? _controller;

  void _fit() {
    final c = _controller;
    final pts = widget.fit;
    if (c == null || pts.length < 2) return;
    var west = pts.first.longitude, east = west;
    var south = pts.first.latitude, north = south;
    for (final p in pts) {
      if (p.longitude < west) west = p.longitude;
      if (p.longitude > east) east = p.longitude;
      if (p.latitude < south) south = p.latitude;
      if (p.latitude > north) north = p.latitude;
    }
    c.fitBounds(
      bounds: ml.LngLatBounds(
        longitudeWest: west,
        longitudeEast: east,
        latitudeSouth: south,
        latitudeNorth: north,
      ),
      padding: widget.fitPadding,
      nativeDuration: Duration.zero,
    );
  }

  @override
  Widget build(BuildContext context) {
    final tiles = ref.watch(mapTilesEnabledProvider);
    if (!tiles) return _placeholder();
    return ClipRect(
      child: ml.MapLibreMap(
        options: ml.MapOptions(
          initCenter: _geo(widget.center),
          initZoom: widget.zoom,
          initStyle: kMapStyleUrl,
        ),
        onMapCreated: (c) => _controller = c,
        onStyleLoaded: (_) => _fit(),
        layers: [
          if (widget.route.length > 1)
            ml.PolylineLayer(
              polylines: [
                ml.Feature(
                  geometry: ml.LineString.from(
                    [for (final p in widget.route) _geo(p)],
                  ),
                ),
              ],
              color: AppColors.mapRoute,
              width: 6,
            ),
        ],
        children: [
          ml.WidgetLayer(markers: [
            for (final m in widget.markers)
              ml.Marker(
                point: _geo(m.point),
                size: Size(m.width, m.height),
                child: m.child,
              ),
          ]),
          const ml.SourceAttribution(),
        ],
      ),
    );
  }

  /// Tile-free stand-in (tests): same markers, no network.
  Widget _placeholder() => Stack(
        children: [
          const Positioned.fill(
            child: ColoredBox(
                key: ValueKey('map-placeholder'), color: AppColors.card),
          ),
          for (final m in widget.markers)
            Positioned(
                left: 0, top: 0, width: m.width, height: m.height, child: m.child),
        ],
      );
}
