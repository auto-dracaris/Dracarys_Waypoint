import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../connectivity/online_provider.dart';
import 'status_pill.dart';

/// The Online / Offline pill shown on every tab. Long-press toggles the
/// (mock) connectivity so the offline state can be demoed.
class OnlineStatusPill extends ConsumerWidget {
  const OnlineStatusPill({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final online = ref.watch(onlineProvider);
    return StatusPill(
      label: online ? 'Online' : 'Offline',
      kind: online ? StatusKind.success : StatusKind.neutral,
      onLongPress: () => ref.read(onlineProvider.notifier).toggle(),
    );
  }
}
