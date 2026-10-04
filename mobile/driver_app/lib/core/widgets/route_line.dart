import 'dart:convert';

import 'package:latlong2/latlong.dart';

/// Source/layer ids for the route line drawn by [MapView]. The line is added
/// through the style API just before the vehicle layer, so the van is always
/// drawn on top of it.
const routeSourceId = 'wp-route';
const routeLayerId = 'wp-route-line';

const emptyRouteGeoJson = '{"type":"FeatureCollection","features":[]}';

/// [route] as a GeoJSON LineString (coordinates are lng,lat), or an empty
/// collection when there is nothing to draw.
String routeLineGeoJson(List<LatLng> route) {
  if (route.length < 2) return emptyRouteGeoJson;
  return jsonEncode({
    'type': 'Feature',
    'properties': <String, Object>{},
    'geometry': {
      'type': 'LineString',
      'coordinates': [
        for (final p in route) [p.longitude, p.latitude],
      ],
    },
  });
}
