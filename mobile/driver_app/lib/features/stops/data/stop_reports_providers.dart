import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/demo_mode.dart';
import '../../../core/clock.dart';
import '../../sync/data/sync_providers.dart';
import 'http_stop_reports_repository.dart';
import 'mock_stop_reports_repository.dart';
import 'stop_reports_repository.dart';

final stopReportsRepositoryProvider = Provider<StopReportsRepository>((ref) {
  if (ref.watch(demoModeProvider)) return MockStopReportsRepository();
  return HttpStopReportsRepository(
    ref.watch(actionSubmitterProvider),
    now: ref.watch(clockProvider),
  );
});
