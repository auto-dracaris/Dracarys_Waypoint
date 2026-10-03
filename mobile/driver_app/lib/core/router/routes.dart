/// Path builders for the trip flow, so screens never hand-assemble URLs.
abstract final class AppRoutes {
  static const trips = '/trips';
  static const updates = '/updates';

  static String trip(String tripId) => '/trips/trip/$tripId';
  static String offline(String tripId) => '${trip(tripId)}/offline';
  static String routeUpdate(String tripId) =>
      '/updates/route-update/$tripId';
  static String stop(String tripId, String stopId) =>
      '${trip(tripId)}/stop/$stopId';
  static String navigate(String tripId, String stopId) =>
      '${stop(tripId, stopId)}/navigate';
  static String arrived(String tripId, String stopId) =>
      '${stop(tripId, stopId)}/arrived';
  static String proof(String tripId, String stopId) =>
      '${stop(tripId, stopId)}/proof';
  static String issue(String tripId, String stopId, String orderId) =>
      '${stop(tripId, stopId)}/issue/$orderId';
}
