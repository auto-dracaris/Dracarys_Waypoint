import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/storage/offline_cache.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../sync/data/sync_providers.dart';
import '../domain/saved_record.dart';
import '../../../core/demo_mode.dart';
import '../../../core/api/api_providers.dart';
import 'http_records_repository.dart';
import 'mock_records_repository.dart';
import 'records_repository.dart';

final recordsRepositoryProvider = Provider<RecordsRepository>((ref) {
  if (ref.watch(demoModeProvider)) return MockRecordsRepository();
  return HttpRecordsRepository(
    ref.watch(apiClientProvider),
    cache: ref.watch(offlineCacheProvider),
    queue: ref.watch(actionQueueProvider),
  );
});

final recordsProvider = FutureProvider.family<List<SavedRecord>, String>((
  ref,
  tripId,
) {
  ref.watch(authControllerProvider);
  return ref.watch(recordsRepositoryProvider).list(tripId);
});
