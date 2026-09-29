import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../connectivity/online_provider.dart';
import '../theme/app_colors.dart';
import '../theme/app_text.dart';

/// White outlined "● Online" pill (red "Offline" when disconnected).
/// Long-press toggles the mock connectivity for demos.
class ConnectionPill extends ConsumerWidget {
  const ConnectionPill({super.key, this.compact = false});

  /// Smaller text and padding (route-update header).
  final bool compact;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final online = ref.watch(onlineProvider);
    return GestureDetector(
      onLongPress: () => ref.read(onlineProvider.notifier).toggle(),
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: compact ? 8 : 12, vertical: 4),
        decoration: BoxDecoration(
          color: online ? AppColors.surface : AppColors.red100,
          border:
              Border.all(color: online ? AppColors.border : AppColors.red100),
          borderRadius: BorderRadius.circular(9999),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (online) ...[
              Container(
                width: 8,
                height: 8,
                decoration: const BoxDecoration(
                    color: AppColors.lime500, shape: BoxShape.circle),
              ),
              SizedBox(width: compact ? 4 : 6),
            ],
            Text(
              online ? 'Online' : 'Offline',
              style: (compact ? AppText.textXsRegular : AppText.textSmRegular)
                  .copyWith(color: online ? AppColors.ink : AppColors.red700),
            ),
          ],
        ),
      ),
    );
  }
}
