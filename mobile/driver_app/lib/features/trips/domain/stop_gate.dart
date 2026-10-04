import 'stop.dart';
import 'trip.dart';

/// Why a stop can or cannot be worked on right now.
enum StopAccess {
  /// The trip is on the road and this is the stop the driver is working on:
  /// directions, arriving, proof and issues are all allowed.
  actionable,

  /// Already delivered: can be looked at, nothing more to do.
  completed,

  /// The trip has not started (still being loaded, or loaded and waiting for the
  /// start code). Nothing can be done at a stop yet.
  tripNotStarted,

  /// An earlier stop comes first. Stops are delivered in order.
  waitsForEarlier,

  /// The trip is over.
  tripFinished,
}

/// The verdict for one stop, with words to show the driver when it is not
/// [StopAccess.actionable].
class StopGate {
  const StopGate(this.access, this.title, this.message);

  final StopAccess access;
  final String title;
  final String message;

  bool get canAct => access == StopAccess.actionable;

  /// Nothing to do here and nothing blocking either (delivered, or trip over).
  bool get isDone =>
      access == StopAccess.completed || access == StopAccess.tripFinished;
}

const _actionable = StopGate(StopAccess.actionable, '', '');

/// The one rule for what a driver may do at [stop] of [trip], matching what the
/// server enforces: stop actions need the trip to be on the road
/// (`in_progress`), and stops are done strictly in order.
///
/// Every stop screen, the trip's stop list and the repositories ask this, so
/// an action that would be refused is neither offered nor saved to the offline
/// queue.
StopGate stopGate(Trip trip, Stop stop) {
  switch (trip.status) {
    case TripStatus.assigned:
      return const StopGate(
        StopAccess.tripNotStarted,
        'Not loaded yet',
        'This trip has not started loading. You can work on its stops once '
            'the vehicle is loaded and you have started the trip.',
      );
    case TripStatus.loading:
      return const StopGate(
        StopAccess.tripNotStarted,
        'Still being loaded',
        'The loading team is still loading the vehicle. You can work on the '
            'stops once loading is done and you have started the trip.',
      );
    case TripStatus.ready:
      return const StopGate(
        StopAccess.tripNotStarted,
        'Start the trip first',
        'The vehicle is loaded. Enter the start code on the trip page to leave '
            'the depot, then the stops open.',
      );
    case TripStatus.completed:
      return StopGate(
        StopAccess.tripFinished,
        'Trip finished',
        'This trip is complete. Its stops are kept here for reference.',
      );
    case TripStatus.inProgress:
      if (stop.status == StopStatus.completed) {
        return const StopGate(
          StopAccess.completed,
          'Delivered',
          'This stop is done.',
        );
      }
      final active = trip.activeStop;
      if (active != null && active.id != stop.id) {
        return StopGate(
          StopAccess.waitsForEarlier,
          'Not your next stop',
          'Finish ${active.name} (stop ${active.sequence}) first. Stops are '
              'delivered in order.',
        );
      }
      return _actionable;
  }
}

/// What to say when the driver tries to arrive at or complete a stop that the
/// rule above does not allow; null when it is fine.
String? stopActionRefusal(Trip trip, Stop stop) {
  final gate = stopGate(trip, stop);
  return gate.canAct ? null : gate.message;
}

/// The stop an arrival should be recorded for: [stopId] when given, else the one
/// the driver is working on. Null when there is nothing to do (it is already
/// arrived or delivered). Throws [StateError], with words fit for the driver,
/// when arriving there is not allowed.
Stop? stopToArriveAt(Trip trip, {String? stopId}) {
  final stop = stopId == null
      ? trip.activeStop
      : trip.stops.where((s) => s.id == stopId).firstOrNull;
  if (stop == null) {
    if (stopId != null) throw StateError('That stop is not on this trip.');
    return null;
  }
  if (stop.status != StopStatus.pending) return null;
  final refusal = stopActionRefusal(trip, stop);
  if (refusal != null) throw StateError(refusal);
  return stop;
}

/// The stop to complete: null when it is not the arrived stop of this trip
/// (nothing to do); throws [StateError] when the rule does not allow it.
Stop? stopToComplete(Trip trip, String stopId) {
  final stop = trip.stops.where((s) => s.id == stopId).firstOrNull;
  if (stop == null || stop.status != StopStatus.arrived) return null;
  final refusal = stopActionRefusal(trip, stop);
  if (refusal != null) throw StateError(refusal);
  return stop;
}
