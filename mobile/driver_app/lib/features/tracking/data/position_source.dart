import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

/// One reading from the phone's GPS.
class GpsFix {
  const GpsFix({
    required this.lat,
    required this.lng,
    required this.time,
    this.headingDegrees,
    this.speedMps,
    this.accuracyMeters,
  });

  final double lat;
  final double lng;

  /// The phone's clock when the reading was taken.
  final DateTime time;

  /// Compass degrees, or null/negative when the phone cannot tell (standing
  /// still, usually).
  final double? headingDegrees;

  /// Metres per second, or null/negative when unknown.
  final double? speedMps;

  /// How far off the reading might be, in metres.
  final double? accuracyMeters;
}

/// Why the GPS cannot be used; [message] is fit to show the driver.
class LocationUnavailable implements Exception {
  const LocationUnavailable(this.message);

  final String message;

  @override
  String toString() => message;
}

/// Where the vehicle's position comes from. A seam for the platform plugin, so
/// tracking can be tested without a GPS.
abstract interface class PositionSource {
  /// Readings as they arrive. Errors with [LocationUnavailable] when location
  /// is switched off or the driver has not allowed it.
  Stream<GpsFix> watch();
}

class GeolocatorPositionSource implements PositionSource {
  const GeolocatorPositionSource();

  @override
  Stream<GpsFix> watch() async* {
    if (!await Geolocator.isLocationServiceEnabled()) {
      throw const LocationUnavailable(
        'Location is switched off on this phone, so the dispatcher cannot '
        'see your vehicle. Turn it on in Settings.',
      );
    }
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      throw const LocationUnavailable(
        'Waypoint is not allowed to use your location, so the dispatcher '
        'cannot see your vehicle. Allow it in Settings.',
      );
    }

    final LocationSettings settings = switch (defaultTargetPlatform) {
      TargetPlatform.android => AndroidSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 0,
        intervalDuration: const Duration(seconds: 1),
        // Keeps the points coming with the screen off. The notification is how
        // Android tells the driver the phone is sharing its position.
        foregroundNotificationConfig: const ForegroundNotificationConfig(
          notificationTitle: 'Trip in progress',
          notificationText: "Waypoint is sharing this vehicle's position with the dispatcher.",
          enableWakeLock: true,
          setOngoing: true,
        ),
      ),
      TargetPlatform.iOS => AppleSettings(
        accuracy: LocationAccuracy.high,
        activityType: ActivityType.automotiveNavigation,
        distanceFilter: 0,
        pauseLocationUpdatesAutomatically: false,
        showBackgroundLocationIndicator: true,
        allowBackgroundLocationUpdates: true,
      ),
      _ => const LocationSettings(accuracy: LocationAccuracy.high),
    };

    yield* Geolocator.getPositionStream(locationSettings: settings).map(
      (p) => GpsFix(
        lat: p.latitude,
        lng: p.longitude,
        time: p.timestamp,
        headingDegrees: p.heading,
        speedMps: p.speed,
        accuracyMeters: p.accuracy,
      ),
    );
  }
}

final positionSourceProvider = Provider<PositionSource>(
  (_) => const GeolocatorPositionSource(),
);
