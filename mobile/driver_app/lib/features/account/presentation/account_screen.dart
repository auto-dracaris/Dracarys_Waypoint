import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/async_value_view.dart';
import '../../auth/presentation/auth_controller.dart';

/// Placeholder — replaced by the Account screen plan (keeps sign out).
class AccountScreen extends ConsumerWidget {
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final driver = ref.watch(authControllerProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Account')),
      body: AsyncValueView(
        value: driver,
        data: (d) => Column(
          children: [
            ListTile(
              title: Text(d?.name ?? ''),
              subtitle: Text('Driver · ${d?.code ?? ''}'),
            ),
            TextButton(
              onPressed: () =>
                  ref.read(authControllerProvider.notifier).logout(),
              child: const Text('Sign out'),
            ),
          ],
        ),
      ),
    );
  }
}
