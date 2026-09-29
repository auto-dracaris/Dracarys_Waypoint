import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Quantities the driver has entered for the stop in progress, by order id.
/// An order with no entry is delivered in full (its planned quantity).
class DeliveredQuantities extends Notifier<Map<String, int>> {
  @override
  Map<String, int> build() => const {};

  void set(String orderId, int cases) =>
      state = {...state, orderId: cases};

  void clear() => state = const {};
}

final deliveredQuantitiesProvider =
    NotifierProvider<DeliveredQuantities, Map<String, int>>(
        DeliveredQuantities.new);
