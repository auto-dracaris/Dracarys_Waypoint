import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text.dart';
import '../application/location_tracker.dart';

/// Shown on My trips while a trip is under way but the phone cannot give its
/// position (location off, or not allowed): without it the dispatcher cannot see
/// the vehicle. Hidden otherwise.
class LocationNotice extends ConsumerWidget {
  const LocationNotice({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final problem = ref.watch(locationTrackerProvider.select((s) => s.problem));
    if (problem == null) return const SizedBox.shrink();
    return Material(
      key: const Key('location-notice'),
      color: AppColors.red50,
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 10, 8, 10),
        decoration: const BoxDecoration(
          border: Border.symmetric(
            horizontal: BorderSide(color: AppColors.red200),
          ),
        ),
        child: Row(
          children: [
            const Icon(
              Icons.location_off_rounded,
              size: 20,
              color: AppColors.red700,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                problem,
                style: AppText.textXsRegular.copyWith(color: AppColors.red700),
              ),
            ),
            TextButton(
              key: const Key('location-retry'),
              onPressed: () =>
                  ref.read(locationTrackerProvider.notifier).tick(),
              child: const Text('Try again'),
            ),
          ],
        ),
      ),
    );
  }
}
