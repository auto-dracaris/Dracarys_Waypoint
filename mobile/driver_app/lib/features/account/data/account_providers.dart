import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/demo_mode.dart';
import '../../../core/api/api_providers.dart';
import 'account_repository.dart';
import 'http_account_repository.dart';
import 'mock_account_repository.dart';

final accountRepositoryProvider = Provider<AccountRepository>((ref) {
  if (ref.watch(demoModeProvider)) return MockAccountRepository();
  return HttpAccountRepository(ref.watch(apiClientProvider));
});
