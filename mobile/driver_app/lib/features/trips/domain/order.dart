enum Temperature { chilled, ambient }

enum OrderStatus { pendingDelivery, delivered }

class Order {
  const Order({
    required this.id,
    required this.storeName,
    required this.cases,
    required this.temperature,
    this.status = OrderStatus.pendingDelivery,
  });

  final String id;
  final String storeName;
  final int cases;
  final Temperature temperature;
  final OrderStatus status;
}
