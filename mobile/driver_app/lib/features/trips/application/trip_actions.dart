import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/trips_providers.dart';

/// Driver actions on a trip. Each one calls the repository and then refreshes
/// the providers that screens watch, so the UI never shows stale progress.
class TripActions {
  TripActions(this._ref);

  final Ref _ref;

  Future<void> startTrip(String tripId) async {
    await _ref.read(tripsRepositoryProvider).startTrip(tripId);
    _refresh(tripId);
  }

  Future<void> markArrived(String tripId) async {
    await _ref.read(tripsRepositoryProvider).markArrived(tripId);
    _refresh(tripId);
  }

  Future<void> completeStop(
    String tripId,
    String stopId, {
    Map<String, int> deliveredCases = const {},
  }) async {
    await _ref
        .read(tripsRepositoryProvider)
        .completeStop(tripId, stopId, deliveredCases: deliveredCases);
    _refresh(tripId);
  }

  void _refresh(String tripId) {
    _ref.invalidate(tripsProvider);
    _ref.invalidate(tripProvider(tripId));
  }
}

final tripActionsProvider = Provider<TripActions>(TripActions.new);
