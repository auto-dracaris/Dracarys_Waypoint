/// One GPS reading of the vehicle, as the phone took it.
class LocationPoint {
  const LocationPoint({
    required this.id,
    required this.lat,
    required this.lng,
    required this.recordedAt,
    this.heading,
    this.speedKmh,
  });

  /// Made once, when the point is taken, and kept with it. It becomes the
  /// point's id on the server, so sending the same point twice stores it once.
  final String id;
  final double lat;
  final double lng;

  /// Degrees clockwise from north, 0 to 360; null when the phone has none.
  final int? heading;
  final double? speedKmh;

  /// The phone's clock when the fix was taken, not the time it is sent.
  final DateTime recordedAt;

  /// The body the API takes (`POST /vehicles/:id/locations`). Any field it does
  /// not list is rejected, so nothing extra goes here.
  Map<String, Object?> toApi() => {
    'clientId': id,
    'lat': lat,
    'lng': lng,
    'heading': ?heading,
    'speedKmh': ?speedKmh,
    'recordedAt': recordedAt.toUtc().toIso8601String(),
  };

  Map<String, Object?> toJson() => toApi();

  factory LocationPoint.fromJson(Map<String, dynamic> j) => LocationPoint(
    id: j['clientId'] as String,
    lat: (j['lat'] as num).toDouble(),
    lng: (j['lng'] as num).toDouble(),
    heading: (j['heading'] as num?)?.toInt(),
    speedKmh: (j['speedKmh'] as num?)?.toDouble(),
    recordedAt: DateTime.parse(j['recordedAt'] as String),
  );
}
