enum StopMovement { none, up, down }

/// One row in the previous / updated stop order.
class SequenceStop {
  const SequenceStop({
    required this.name,
    this.area,
    this.completed = false,
    this.movement = StopMovement.none,
  });

  final String name;

  /// Town shown under the name for stops that are still ahead.
  final String? area;
  final bool completed;
  final StopMovement movement;
}

/// A reorder of the remaining stops pushed by the dispatcher while the driver
/// is on the road, and what it means for arrival times.
class RouteChange {
  const RouteChange({
    required this.tripId,
    required this.planVersion,
    required this.updatedAt,
    required this.reason,
    required this.previous,
    required this.updated,
    required this.impactStopName,
    required this.impactArrivalNow,
    required this.impactArrivalWas,
    required this.tightWindow,
    this.acknowledged = false,
  });

  final String tripId;
  final int planVersion;
  final DateTime updatedAt;
  final String reason;
  final List<SequenceStop> previous;
  final List<SequenceStop> updated;
  final String impactStopName;
  final String impactArrivalNow;
  final String impactArrivalWas;
  final String? tightWindow;
  final bool acknowledged;

  RouteChange copyWith({bool? acknowledged}) => RouteChange(
        tripId: tripId,
        planVersion: planVersion,
        updatedAt: updatedAt,
        reason: reason,
        previous: previous,
        updated: updated,
        impactStopName: impactStopName,
        impactArrivalNow: impactArrivalNow,
        impactArrivalWas: impactArrivalWas,
        tightWindow: tightWindow,
        acknowledged: acknowledged ?? this.acknowledged,
      );
}
