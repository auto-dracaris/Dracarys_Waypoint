import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';
import 'package:maplibre/maplibre.dart' as ml;

import '../../../core/widgets/map_style.dart';

/// Downloads the map for a trip's area so it can be shown with no signal.
abstract interface class OfflineMapService {
  /// Makes sure the map around [points] is on the phone, filed under [key]
  /// (one per trip). Does nothing if it already is, or if this platform cannot
  /// store maps. Never throws: a failed download just means the map is not
  /// available offline yet, and the next attempt tries again.
  Future<void> ensureRegion({
    required String key,
    required List<LatLng> points,
  });
}

/// The vector tiles the app uses stop at zoom 14 and are stretched beyond
/// that, so storing zoom 9 to 14 covers every zoom the driver can reach. A
/// whole district at that depth is a few hundred tiles.
class MaplibreOfflineMapService implements OfflineMapService {
  static const _minZoom = 9.0;
  static const _maxZoom = 14.0;

  /// Trips whose maps are kept; older ones are removed to bound the storage.
  static const _keep = 4;

  ml.OfflineManager? _manager;
  final _inFlight = <String>{};

  @override
  Future<void> ensureRegion({
    required String key,
    required List<LatLng> points,
  }) async {
    if (points.length < 2 || !_inFlight.add(key)) return;
    try {
      if (!ml.OfflineManager.isSupported) return;
      final manager = _manager ??= await ml.OfflineManager.createInstance();
      final regions = await manager.listOfflineRegions();
      if (regions.any((r) => r.metadata['key'] == key)) return;

      var west = points.first.longitude, east = west;
      var south = points.first.latitude, north = south;
      for (final p in points) {
        if (p.longitude < west) west = p.longitude;
        if (p.longitude > east) east = p.longitude;
        if (p.latitude < south) south = p.latitude;
        if (p.latitude > north) north = p.latitude;
      }
      const pad = 0.03; // about 3 km: room around the outer stops
      await manager
          .downloadRegion(
            mapStyleUrl: kMapStyleUrl,
            bounds: ml.LngLatBounds(
              longitudeWest: west - pad,
              longitudeEast: east + pad,
              latitudeSouth: south - pad,
              latitudeNorth: north + pad,
            ),
            minZoom: _minZoom,
            maxZoom: _maxZoom,
            pixelDensity: 2,
            metadata: {'key': key},
          )
          .last;

      final all = await manager.listOfflineRegions()
        ..sort((a, b) => a.id.compareTo(b.id));
      for (final old in all.take((all.length - _keep).clamp(0, all.length))) {
        await manager.deleteRegion(regionId: old.id);
      }
    } catch (_) {
      // Offline maps are a convenience; the live map and the saved road line
      // still work, and this runs again the next time the trips load.
    } finally {
      _inFlight.remove(key);
    }
  }
}

class NoOfflineMapService implements OfflineMapService {
  const NoOfflineMapService();

  @override
  Future<void> ensureRegion({
    required String key,
    required List<LatLng> points,
  }) async {}
}

final offlineMapServiceProvider = Provider<OfflineMapService>(
  (_) => MaplibreOfflineMapService(),
);
