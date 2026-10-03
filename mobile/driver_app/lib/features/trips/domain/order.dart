enum Temperature { chilled, ambient }

enum OrderStatus { pendingDelivery, delivered }

class Order {
  const Order({
    required this.id,
    required this.storeName,
    required this.cases,
    required this.temperature,
    this.status = OrderStatus.pendingDelivery,
    this.deliveredCases,
    this.handling,
  });

  final String id;
  final String storeName;

  /// Planned quantity.
  final int cases;
  final Temperature temperature;
  final OrderStatus status;

  /// Quantity actually handed over; null until the stop is completed.
  final int? deliveredCases;

  /// Handling instruction shown at the stop, e.g. "Keep cold chain intact."
  final String? handling;

  Order copyWith({OrderStatus? status, int? deliveredCases}) => Order(
        id: id,
        storeName: storeName,
        cases: cases,
        temperature: temperature,
        status: status ?? this.status,
        deliveredCases: deliveredCases ?? this.deliveredCases,
        handling: handling,
      );
}
