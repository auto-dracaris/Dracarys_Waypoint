import '../../../core/format.dart';
import '../../route_update/data/route_changes_repository.dart';
import '../../trips/data/trips_repository.dart';
import '../../trips/domain/trip.dart';
import '../domain/app_notification.dart';
import 'notifications_repository.dart';

/// The API has no notifications feed, so the Updates tab is built from what it
/// does have: today's trips (assigned, loading, loaded, a loading shortfall)
/// and the dispatcher's unacknowledged route changes.
class DerivedNotificationsRepository implements NotificationsRepository {
  DerivedNotificationsRepository(
    this._trips,
    this._routeChanges, {
    DateTime Function()? now,
  }) : _now = now ?? DateTime.now;

  final TripsRepository _trips;
  final RouteChangesRepository _routeChanges;
  final DateTime Function() _now;

  @override
  Future<List<AppNotification>> getNotifications() async {
    final trips = await _trips.getTrips(date: _now());
    final out = <AppNotification>[];

    for (final trip in trips) {
      final at = trip.updatedAt ?? trip.departure;
      final stops =
          '${trip.stops.length} ${trip.stops.length == 1 ? 'stop' : 'stops'}';

      switch (trip.status) {
        case TripStatus.assigned:
          out.add(
            AppNotification(
              id: '${trip.id}:assigned',
              kind: NotificationKind.tripAssigned,
              title: '${trip.name} assigned',
              body: trip.subtitle,
              footnote:
                  '$stops · Planned departure ${formatTime(trip.departure)}',
              createdAt: at,
              severity: NotificationSeverity.info,
              tripId: trip.id,
              actionLabel: 'View trip',
            ),
          );
        case TripStatus.loading:
          out.add(
            AppNotification(
              id: '${trip.id}:loading',
              kind: NotificationKind.loadingStarted,
              title: 'Loading started for ${trip.name}',
              body:
                  'The loading team is preparing your $stops. '
                  'Loading is still in progress.',
              createdAt: at,
              severity: NotificationSeverity.warning,
              tripId: trip.id,
              actionLabel: 'View trip',
            ),
          );
        case TripStatus.ready:
          out.add(
            AppNotification(
              id: '${trip.id}:ready',
              kind: NotificationKind.loadingStarted,
              title: '${trip.name} is loaded and ready',
              body: 'Get the start code from the loader, then depart.',
              createdAt: at,
              severity: NotificationSeverity.success,
              tripId: trip.id,
              actionLabel: 'View trip',
            ),
          );
        case TripStatus.inProgress:
        case TripStatus.completed:
          break;
      }

      final shortfall = trip.shortfall;
      if (shortfall != null && trip.status != TripStatus.completed) {
        out.add(
          AppNotification(
            id: '${trip.id}:shortfall',
            kind: NotificationKind.loadingStarted,
            title: 'Cases short on ${trip.name}',
            body:
                '${shortfall.shortCases} of ${shortfall.plannedCases} cases '
                'for ${shortfall.storeName} were not loaded.',
            footnote: shortfall.dispatcherNote,
            createdAt: at,
            severity: NotificationSeverity.warning,
            tripId: trip.id,
            actionLabel: 'View trip',
          ),
        );
      }

      if (trip.status != TripStatus.completed) {
        final change = await _routeChanges.get(trip.id);
        if (change != null && !change.acknowledged) {
          out.add(
            AppNotification(
              id: '${trip.id}:route-${change.planVersion}',
              kind: NotificationKind.stopSequenceChanged,
              title: '${trip.name} stop sequence updated',
              body: change.reason.isEmpty
                  ? 'The dispatcher changed the delivery order.'
                  : change.reason,
              createdAt: change.updatedAt,
              severity: NotificationSeverity.error,
              tripId: trip.id,
              actionLabel: 'Review changes',
            ),
          );
        }
      }
    }

    out.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return out;
  }
}
