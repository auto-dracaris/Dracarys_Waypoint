import '../../trips/domain/order.dart';
import '../../trips/domain/stop.dart';
import '../../trips/domain/trip.dart';
import 'pending_action.dart';

/// The trip as the driver has left it: what the server last said, with the
/// actions still waiting to be sent applied on top. Without this, a stop
/// completed with no signal would reappear as pending the next time the
/// screen loaded, and the driver would be asked to do it all again.
Trip applyPending(Trip trip, Iterable<PendingAction> actions) {
  var result = trip;
  for (final a in actions) {
    if (a.tripId != trip.id || !a.isPending) continue;
    switch (a.kind) {
      case ActionKind.arrive:
        result = _replace(result, a.stopId, (s) {
          if (s.status != StopStatus.pending) return s;
          return s.copyWith(
            status: StopStatus.arrived,
            arrivedAt:
                DateTime.tryParse('${a.body['arrivedAt']}')?.toLocal() ??
                a.createdAt,
          );
        });
      case ActionKind.complete:
        final cases = Map<String, Object?>.from(
          (a.body['deliveredCases'] as Map?) ?? const {},
        );
        result = _replace(result, a.stopId, (s) {
          if (s.status == StopStatus.completed) return s;
          return s.copyWith(
            status: StopStatus.completed,
            orders: [
              for (final o in s.orders)
                o.copyWith(
                  status: OrderStatus.delivered,
                  deliveredCases: (cases[o.id] as num?)?.toInt() ?? o.cases,
                ),
            ],
          );
        });
      case ActionKind.proof:
      case ActionKind.issue:
      case ActionKind.ackRoute:
        break;
    }
  }
  if (result.status == TripStatus.inProgress &&
      result.stops.isNotEmpty &&
      result.activeStop == null) {
    result = result.copyWith(status: TripStatus.completed);
  }
  return result;
}

Trip _replace(Trip trip, String? stopId, Stop Function(Stop) change) =>
    trip.copyWith(
      stops: [for (final s in trip.stops) s.id == stopId ? change(s) : s],
    );
