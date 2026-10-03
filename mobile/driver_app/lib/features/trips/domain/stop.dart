import 'order.dart';

enum StopStatus { pending, arrived, completed }

class Stop {
  const Stop({
    required this.id,
    required this.sequence,
    required this.name,
    required this.deliveryWindow,
    required this.plannedArrival,
    required this.dock,
    required this.lat,
    required this.lng,
    required this.orders,
    this.contactPhone = '',
    this.etaMinutes = 0,
    this.distanceKm = 0,
    this.status = StopStatus.pending,
    this.arrivedAt,
  });

  final String id;
  final int sequence;
  final String name;
  final String deliveryWindow;
  final DateTime plannedArrival;
  final String dock;
  final double lat;
  final double lng;
  final List<Order> orders;
  final String contactPhone;

  /// Driving time and distance from the previous point (mock routing data).
  final int etaMinutes;
  final double distanceKm;
  final StopStatus status;
  final DateTime? arrivedAt;

  Stop copyWith({
    StopStatus? status,
    DateTime? arrivedAt,
    List<Order>? orders,
  }) =>
      Stop(
        id: id,
        sequence: sequence,
        name: name,
        deliveryWindow: deliveryWindow,
        plannedArrival: plannedArrival,
        dock: dock,
        lat: lat,
        lng: lng,
        orders: orders ?? this.orders,
        contactPhone: contactPhone,
        etaMinutes: etaMinutes,
        distanceKm: distanceKm,
        status: status ?? this.status,
        arrivedAt: arrivedAt ?? this.arrivedAt,
      );
}
