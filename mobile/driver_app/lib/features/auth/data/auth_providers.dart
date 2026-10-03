import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_config.dart';
import '../../../core/api/api_providers.dart';
import 'auth_repository.dart';
import 'http_auth_repository.dart';
import 'mock_auth_repository.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  if (useMocks) return MockAuthRepository();
  return HttpAuthRepository(
      ref.watch(apiClientProvider), ref.watch(tokenStoreProvider));
});
