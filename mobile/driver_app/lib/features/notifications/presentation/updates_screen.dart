import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/async_value_view.dart';
import '../data/notifications_providers.dart';

/// Placeholder — replaced by the Updates screen plan.
class UpdatesScreen extends ConsumerWidget {
  const UpdatesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final items = ref.watch(notificationsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Updates')),
      body: AsyncValueView(
        value: items,
        onRetry: () => ref.invalidate(notificationsProvider),
        isEmpty: (l) => l.isEmpty,
        emptyMessage: 'No updates',
        data: (list) => ListView(
          children: [for (final n in list) ListTile(title: Text(n.title))],
        ),
      ),
    );
  }
}
