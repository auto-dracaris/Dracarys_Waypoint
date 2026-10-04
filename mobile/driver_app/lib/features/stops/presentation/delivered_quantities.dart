import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Quantities the driver has entered for the stop in progress, by order id.
/// An order with no entry is delivered in full (its planned quantity).
class DeliveredQuantities extends Notifier<Map<String, int>> {
  @override
  Map<String, int> build() => const {};

  void set(String orderId, int cases) => state = {...state, orderId: cases};

  void clear() => state = const {};
}

/// Orders at the stop in progress that the driver has reported an issue for.
/// A delivery that is short of the plan cannot go on until its order is here.
class ReportedOrders extends Notifier<Set<String>> {
  @override
  Set<String> build() => const {};

  void add(String orderId) => state = {...state, orderId};

  void clear() => state = const {};
}

final reportedOrdersProvider = NotifierProvider<ReportedOrders, Set<String>>(
  ReportedOrders.new,
);

/// Orders delivered short of plan with no issue reported for them yet.
List<String> unreportedShortOrders(
  Iterable<({String id, int cases})> orders,
  Map<String, int> entered,
  Set<String> reported,
) => [
  for (final o in orders)
    if ((entered[o.id] ?? o.cases) < o.cases && !reported.contains(o.id)) o.id,
];

final deliveredQuantitiesProvider =
    NotifierProvider<DeliveredQuantities, Map<String, int>>(
      DeliveredQuantities.new,
    );
