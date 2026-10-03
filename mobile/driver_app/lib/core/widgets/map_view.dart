import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';
import 'package:maplibre/maplibre.dart' as ml;

import '../theme/app_colors.dart';
import 'map_mode.dart';
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

ml.Geographic _geo(LatLng p) =>
    ml.Geographic(lon: p.longitude, lat: p.latitude);

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
    this.mode = MapMode.flat,
  });

  final LatLng center;
  final double zoom;
  final List<MapMarker> markers;
  final List<LatLng> route;

  /// If given (2+ points), the camera starts framing all of them.
  final List<LatLng> fit;

  /// Space kept clear around the fitted points, e.g. for overlays on the map.
  final EdgeInsets fitPadding;

  /// [MapMode.tilted] tips the camera over [center] so buildings show in 3D.
  final MapMode mode;

  @override
  ConsumerState<MapView> createState() => _MapViewState();
}

class _MapViewState extends ConsumerState<MapView> {
  ml.MapController? _controller;
  Size _size = Size.zero;
  bool _fitted = false;

  static const _tiltPitch = 60.0;
  static const _tiltBearing = 20.0;

  /// Buildings only exist in the vector tiles from this zoom.
  static const _buildingsZoom = 15.0;

  /// Keeps [widget.fitPadding] from swallowing a small map: at most 30% of the
  /// height and 20% of the width on each side.
  EdgeInsets _padding() {
    final p = widget.fitPadding;
    final v = _size.height * 0.3, h = _size.width * 0.2;
    return EdgeInsets.fromLTRB(
      p.left.clamp(0, h).toDouble(),
      p.top.clamp(0, v).toDouble(),
      p.right.clamp(0, h).toDouble(),
      p.bottom.clamp(0, v).toDouble(),
    );
  }

  void _fit({double? pitch, double? bearing, Duration? duration}) {
    final c = _controller;
    final pts = widget.fit;
    if (c == null || pts.length < 2 || _fitted || _size.isEmpty) return;
    _fitted = true;
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
      padding: _padding(),
      pitch: pitch,
      bearing: bearing,
      // MapLibre rejects a zero duration; 1 ms is effectively instant.
      nativeDuration: duration ?? const Duration(milliseconds: 1),
    );
  }

  /// Replaces the style's own `building-3d` layer (which leaves buildings with
  /// no height data flat) with one that falls back to a default height.
  Future<void> _installBuildings() async {
    final style = _controller?.style;
    if (style == null) return;
    await style.addLayer(
      const ml.FillExtrusionStyleLayer(
        id: 'wp-buildings-3d',
        sourceId: 'openmaptiles',
        sourceLayerId: 'building',
        minZoom: 14,
        paint: {
          'fill-extrusion-color': '#d9d6d0',
          'fill-extrusion-opacity': 0.85,
          'fill-extrusion-height': [
            'coalesce',
            ['get', 'render_height'],
            12,
          ],
          'fill-extrusion-base': [
            'coalesce',
            ['get', 'render_min_height'],
            0,
          ],
        },
      ),
      aboveLayerId: 'building-3d',
    );
    await style.removeLayer('building-3d');
  }

  void _applyMode() {
    final c = _controller;
    if (c == null) return;
    if (widget.mode == MapMode.tilted) {
      final zoom = c.getCamera().zoom;
      c.animateCamera(
        center: _geo(widget.center),
        zoom: zoom < _buildingsZoom ? _buildingsZoom : zoom,
        pitch: _tiltPitch,
        bearing: _tiltBearing,
        nativeDuration: const Duration(milliseconds: 800),
      );
    } else {
      const back = Duration(milliseconds: 600);
      if (widget.fit.length > 1) {
        _fitted = false;
        _fit(pitch: 0, bearing: 0, duration: back);
      } else {
        c.animateCamera(pitch: 0, bearing: 0, nativeDuration: back);
      }
    }
  }

  @override
  void didUpdateWidget(MapView old) {
    super.didUpdateWidget(old);
    if (old.mode != widget.mode) _applyMode();
  }

  Future<void> _onStyleLoaded() async {
    try {
      await _installBuildings();
    } catch (_) {
      // Another style may not have that layer; the map still works flat.
    }
    _fit();
    if (widget.mode == MapMode.tilted) _applyMode();
  }

  @override
  Widget build(BuildContext context) {
    final tiles = ref.watch(mapTilesEnabledProvider);
    if (!tiles) return _placeholder();
    return LayoutBuilder(
      builder: (context, box) {
        _size = box.biggest;
        return _map();
      },
    );
  }

  Widget _map() {
    return ClipRect(
      child: ml.MapLibreMap(
        options: ml.MapOptions(
          initCenter: _geo(widget.center),
          initZoom: widget.zoom,
          initStyle: kMapStyleUrl,
        ),
        onMapCreated: (c) => _controller = c,
        onStyleLoaded: (_) => _onStyleLoaded(),
        layers: [
          if (widget.route.length > 1)
            ml.PolylineLayer(
              polylines: [
                ml.Feature(
                  geometry: ml.LineString.from([
                    for (final p in widget.route) _geo(p),
                  ]),
                ),
              ],
              color: AppColors.mapRoute,
              width: 6,
            ),
        ],
        children: [
          ml.WidgetLayer(
            markers: [
              for (final m in widget.markers)
                ml.Marker(
                  point: _geo(m.point),
                  size: Size(m.width, m.height),
                  child: m.child,
                ),
            ],
          ),
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
          key: ValueKey('map-placeholder'),
          color: AppColors.card,
        ),
      ),
      for (final m in widget.markers)
        Positioned(
          left: 0,
          top: 0,
          width: m.width,
          height: m.height,
          child: m.child,
        ),
    ],
  );
}
