import '../domain/saved_record.dart';
import 'records_repository.dart';

class MockRecordsRepository implements RecordsRepository {
  MockRecordsRepository({this.latency = const Duration(milliseconds: 200)});

  final Duration latency;
  final List<SavedRecord> _records = [];

  @override
  Future<void> add(SavedRecord record) async {
    await Future<void>.delayed(latency);
    _records.add(record);
  }

  @override
  Future<List<SavedRecord>> list(String tripId) async {
    await Future<void>.delayed(latency);
    return _records.where((r) => r.tripId == tripId).toList()
      ..sort((a, b) => b.savedAt.compareTo(a.savedAt));
  }
}
