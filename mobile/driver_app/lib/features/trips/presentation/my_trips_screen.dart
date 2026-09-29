import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/async_value_view.dart';
import '../data/trips_providers.dart';

/// Placeholder — replaced by the My Trips screen plan.
class MyTripsScreen extends ConsumerWidget {
  const MyTripsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final trips = ref.watch(tripsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('My trips')),
      body: AsyncValueView(
        value: trips,
        onRetry: () => ref.invalidate(tripsProvider),
        isEmpty: (t) => t.isEmpty,
        emptyMessage: 'No trips assigned',
        data: (list) => ListView(
          children: [for (final t in list) ListTile(title: Text(t.name))],
        ),
      ),
    );
  }
}
