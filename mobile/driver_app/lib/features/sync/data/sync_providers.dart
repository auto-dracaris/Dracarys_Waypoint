import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/connectivity/online_provider.dart';
import '../../../core/storage/local_store.dart';
import '../application/sync_service.dart';
import 'action_executor.dart';
import 'action_queue.dart';
import 'action_submitter.dart';

final actionQueueProvider = Provider<ActionQueue>((ref) {
  final queue = ActionQueue(ref.watch(localStoreProvider));
  ref.onDispose(queue.dispose);
  return queue;
});

final actionExecutorProvider = Provider<ActionExecutor>(
  (ref) => ActionExecutor(
    ref.watch(apiClientProvider),
    ref.watch(localStoreProvider),
  ),
);

final actionSubmitterProvider = Provider<ActionSubmitter>((ref) {
  return ActionSubmitter(
    queue: ref.watch(actionQueueProvider),
    executor: ref.watch(actionExecutorProvider),
    store: ref.watch(localStoreProvider),
    isOnline: () => ref.read(onlineProvider),
    onQueued: () => ref.read(syncServiceProvider.notifier).kick(),
  );
});
