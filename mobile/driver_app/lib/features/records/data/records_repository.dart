import '../domain/saved_record.dart';

abstract interface class RecordsRepository {
  Future<void> add(SavedRecord record);

  /// A trip's records, newest first. Empty for unknown trips.
  Future<List<SavedRecord>> list(String tripId);
}
