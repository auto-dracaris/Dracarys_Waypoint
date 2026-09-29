import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/presentation/auth_controller.dart';
import '../domain/saved_record.dart';
import 'mock_records_repository.dart';
import 'records_repository.dart';

final recordsRepositoryProvider =
    Provider<RecordsRepository>((ref) => MockRecordsRepository());

final recordsProvider =
    FutureProvider.family<List<SavedRecord>, String>((ref, tripId) {
  ref.watch(authControllerProvider);
  return ref.watch(recordsRepositoryProvider).list(tripId);
});
