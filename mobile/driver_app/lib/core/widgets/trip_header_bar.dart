import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../connectivity/online_provider.dart';
import '../theme/app_colors.dart';
import '../theme/app_text.dart';

/// Single-row header used on delivery screens: "← My trips" on the left,
/// truck + plate and the connectivity label on the right.
class TripHeaderBar extends ConsumerWidget {
  const TripHeaderBar({super.key, required this.plate, required this.onBack});

  final String plate;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final online = ref.watch(onlineProvider);
    return Container(
      color: AppColors.surface,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              InkWell(
                key: const Key('back-bar-button'),
                onTap: onBack,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SvgPicture.asset('assets/images/back_arrow.svg',
                        width: 18, height: 14),
                    const SizedBox(width: 6),
                    const Text(
                      'My trips',
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: AppColors.backLink,
                      ),
                    ),
                  ],
                ),
              ),
              Row(
                children: [
                  const Icon(Icons.local_shipping_rounded,
                      size: 24, color: AppColors.ink),
                  const SizedBox(width: 6),
                  Text(plate, style: AppText.textSmMedium),
                  const SizedBox(width: 12),
                  GestureDetector(
                    onLongPress: () =>
                        ref.read(onlineProvider.notifier).toggle(),
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
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
