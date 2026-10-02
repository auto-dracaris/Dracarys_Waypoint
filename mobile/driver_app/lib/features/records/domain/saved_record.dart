enum RecordKind { arrival, issue, proof }

/// Whether a record has reached the server. Records made while offline wait.
enum SyncState { synced, waitingToSync }

/// Something the driver did that must reach the dispatcher (arrival, delivery
/// issue, proof of delivery), kept on the device until it is synced.
class SavedRecord {
  const SavedRecord({
    required this.id,
    required this.tripId,
    required this.kind,
    required this.title,
    required this.savedAt,
    required this.syncState,
  });

  final String id;
  final String tripId;
  final RecordKind kind;
  final String title;
  final DateTime savedAt;
  final SyncState syncState;
}
