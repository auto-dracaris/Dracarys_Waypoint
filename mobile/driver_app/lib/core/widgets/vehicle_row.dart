import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../connectivity/online_provider.dart';
import '../theme/app_colors.dart';
import '../theme/app_text.dart';

/// White row under the top bar: truck icon + plate on the left, connectivity
/// pill on the right (Figma "vehicle-row").
class VehicleRow extends ConsumerWidget {
  const VehicleRow({super.key, required this.plate});

  final String plate;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final online = ref.watch(onlineProvider);
    return Container(
      color: AppColors.surface,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              const Icon(Icons.local_shipping_rounded,
                  size: 24, color: AppColors.ink),
              const SizedBox(width: 12),
              Text(plate, style: AppText.textSmMedium),
            ],
          ),
          GestureDetector(
            onLongPress: () => ref.read(onlineProvider.notifier).toggle(),
            child: _ConnectionPill(online: online),
          ),
        ],
      ),
    );
  }
}

class _ConnectionPill extends StatelessWidget {
  const _ConnectionPill({required this.online});

  final bool online;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: online ? AppColors.surface : AppColors.red100,
        border: Border.all(color: online ? AppColors.border : AppColors.red100),
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
            const SizedBox(width: 6),
          ],
          Text(
            online ? 'Online' : 'Offline',
            style: AppText.textSmRegular
                .copyWith(color: online ? AppColors.ink : AppColors.red700),
          ),
        ],
      ),
    );
  }
}
