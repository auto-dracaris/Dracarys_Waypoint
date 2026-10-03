import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../connectivity/online_provider.dart';
import '../theme/app_colors.dart';

/// Small green "Online" / red "Offline" label (Figma "Label", size S).
/// Long-press toggles the mock connectivity for demos.
class ConnectionLabel extends ConsumerWidget {
  const ConnectionLabel({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final online = ref.watch(onlineProvider);
    return GestureDetector(
      onLongPress: () => ref.read(onlineProvider.notifier).toggle(),
      child: Container(
        height: 24,
        padding: const EdgeInsets.symmetric(horizontal: 10),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: online ? AppColors.lime100 : AppColors.red100,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          online ? 'Online' : 'Offline',
          style: TextStyle(
            fontFamily: 'Inter',
            fontSize: 11,
            fontWeight: FontWeight.w500,
            color: online ? AppColors.lime700 : AppColors.red700,
          ),
        ),
      ),
    );
  }
}
