import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/demo_mode.dart';
import '../../../core/api/api_providers.dart';
import '../../../core/storage/offline_cache.dart';
import 'auth_repository.dart';
import 'http_auth_repository.dart';
import 'mock_auth_repository.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  if (ref.watch(demoModeProvider)) return MockAuthRepository();
  return HttpAuthRepository(
      ref.watch(apiClientProvider), ref.watch(tokenStoreProvider),
      cache: ref.watch(offlineCacheProvider));
});
