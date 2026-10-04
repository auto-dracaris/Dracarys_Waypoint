import '../domain/route_change.dart';
import 'route_changes_repository.dart';

class MockRouteChangesRepository implements RouteChangesRepository {
  MockRouteChangesRepository({
    this.latency = const Duration(milliseconds: 300),
    DateTime Function()? now,
  }) {
    final t = (now ?? DateTime.now)();
    _changes = {
      'trip-1': RouteChange(
        tripId: 'trip-1',
        planVersion: 3,
        updatedAt: t.subtract(const Duration(minutes: 2)),
        reason: 'Gampaha Mall access restricted until 08:00 — stops reordered to avoid waiting.',
        previous: const [
          SequenceStop(name: 'Keells Wattala', completed: true),
          SequenceStop(name: 'CargoPack Depot', completed: true),
          SequenceStop(name: 'Waypoint Fresh', area: 'Ja-Ela'),
          SequenceStop(name: 'Gampaha Mall', area: 'Gampaha'),
        ],
        updated: const [
          SequenceStop(name: 'Keells Wattala', completed: true),
          SequenceStop(name: 'CargoPack Depot', completed: true),
          SequenceStop(
            name: 'Gampaha Mall',
            area: 'Gampaha',
            movement: StopMovement.up,
          ),
          SequenceStop(
            name: 'Waypoint Fresh',
            area: 'Ja-Ela',
            movement: StopMovement.down,
          ),
        ],
        impactStopName: 'Waypoint Fresh',
        impactArrivalNow: '07:25 AM',
        impactArrivalWas: '07:10 AM',
        tightWindow: 'Tight Window — Ja-Ela delivery closes 08:00',
      ),
    };
  }

  final Duration latency;
  late Map<String, RouteChange> _changes;

  @override
  Future<RouteChange?> get(String tripId) async {
    await Future<void>.delayed(latency);
    return _changes[tripId];
  }

  @override
  Future<RouteChange> acknowledge(String tripId) async {
    await Future<void>.delayed(latency);
    final change = _changes[tripId];
    if (change == null) throw StateError('No route change for $tripId');
    final done = change.copyWith(acknowledged: true);
    _changes = {..._changes, tripId: done};
    return done;
  }
}
