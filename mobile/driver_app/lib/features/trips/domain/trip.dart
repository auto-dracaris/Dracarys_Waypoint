import 'stop.dart';

enum TripStatus { assigned, loading, ready, inProgress, completed }

class Trip {
  const Trip({
    required this.id,
    required this.name,
    required this.subtitle,
    required this.departure,
    required this.status,
    required this.stops,
  });

  final String id;
  final String name;
  final String subtitle;
  final DateTime departure;
  final TripStatus status;
  final List<Stop> stops;

  int get completedStops =>
      stops.where((s) => s.status == StopStatus.completed).length;

  /// First stop that has not been visited yet.
  Stop? get nextStop {
    for (final s in stops) {
      if (s.status == StopStatus.pending) return s;
    }
    return null;
  }

  /// The stop the driver is working on: first one that is not completed
  /// (pending, or arrived and still being handled).
  Stop? get activeStop {
    for (final s in stops) {
      if (s.status != StopStatus.completed) return s;
    }
    return null;
  }

  Trip copyWith({TripStatus? status, List<Stop>? stops}) => Trip(
        id: id,
        name: name,
        subtitle: subtitle,
        departure: departure,
        status: status ?? this.status,
        stops: stops ?? this.stops,
      );
}
