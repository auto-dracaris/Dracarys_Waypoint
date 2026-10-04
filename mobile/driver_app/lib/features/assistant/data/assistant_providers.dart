import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_config.dart';
import '../../../core/api/api_providers.dart';
import '../../../core/demo_mode.dart';
import 'assistant_repository.dart';
import 'http_assistant_repository.dart';
import 'mock_assistant_repository.dart';

final assistantRepositoryProvider = Provider<AssistantRepository>((ref) {
  if (ref.watch(demoModeProvider)) return MockAssistantRepository();
  return HttpAssistantRepository(
    ref.watch(apiClientProvider),
    baseUrl: aiBaseUrl,
  );
});
