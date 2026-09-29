import 'order.dart';

enum StopStatus { pending, completed }

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
    this.status = StopStatus.pending,
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
  final StopStatus status;

  Stop copyWith({StopStatus? status}) => Stop(
        id: id,
        sequence: sequence,
        name: name,
        deliveryWindow: deliveryWindow,
        plannedArrival: plannedArrival,
        dock: dock,
        lat: lat,
        lng: lng,
        orders: orders,
        status: status ?? this.status,
      );
}
