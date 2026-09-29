/// Path builders for the trip flow, so screens never hand-assemble URLs.
abstract final class AppRoutes {
  static const trips = '/trips';
  static const updates = '/updates';

  static String stop(String tripId, String stopId) =>
      '/trips/trip/$tripId/stop/$stopId';
  static String navigate(String tripId, String stopId) =>
      '${stop(tripId, stopId)}/navigate';
  static String arrived(String tripId, String stopId) =>
      '${stop(tripId, stopId)}/arrived';
}
