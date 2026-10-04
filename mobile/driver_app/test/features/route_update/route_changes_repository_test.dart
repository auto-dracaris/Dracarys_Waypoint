import 'package:driver_app/features/route_update/data/mock_route_changes_repository.dart';
import 'package:driver_app/features/route_update/domain/route_change.dart';
import 'package:flutter_test/flutter_test.dart';

MockRouteChangesRepository repo() => MockRouteChangesRepository(
    latency: Duration.zero, now: () => DateTime(2026, 9, 29, 7, 8));

void main() {
  test('trip 1 has the dispatcher change from the Figma story', () async {
    final change = (await repo().get('trip-1'))!;
    expect(change.planVersion, 3);
    expect(change.updatedAt, DateTime(2026, 9, 29, 7, 6));
    expect(change.reason,
        'Gampaha Mall access restricted until 08:00 — stops reordered to avoid waiting.');
    expect(change.acknowledged, isFalse);

    expect(change.previous.map((s) => s.name),
        ['Keells Wattala', 'CargoPack Depot', 'Waypoint Fresh', 'Gampaha Mall']);
    expect(change.updated.map((s) => s.name),
        ['Keells Wattala', 'CargoPack Depot', 'Gampaha Mall', 'Waypoint Fresh']);
    expect(change.updated[2].movement, StopMovement.up);
    expect(change.updated[3].movement, StopMovement.down);
    expect(change.updated.first.completed, isTrue);
    expect(change.impactArrivalNow, '07:25 AM');
    expect(change.impactArrivalWas, '07:10 AM');
    expect(change.tightWindow, 'Tight Window — Ja-Ela delivery closes 08:00');
  });

  test('a trip without a change returns null', () async {
    expect(await repo().get('trip-2'), isNull);
  });

  test('acknowledging marks it once and is harmless to repeat', () async {
    final r = repo();
    final first = await r.acknowledge('trip-1');
    expect(first.acknowledged, isTrue);
    final again = await r.acknowledge('trip-1');
    expect(again.acknowledged, isTrue);
    expect((await r.get('trip-1'))!.acknowledged, isTrue);
  });

  test('acknowledging a trip with no change throws StateError', () async {
    expect(() => repo().acknowledge('trip-2'), throwsStateError);
  });
}
