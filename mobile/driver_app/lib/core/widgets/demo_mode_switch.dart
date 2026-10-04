import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../demo_mode.dart';
import '../theme/app_colors.dart';
import '../theme/app_text.dart';

/// Developer switch between the real server and built-in demo data, for trying
/// every screen (trips, map, navigation, offline) before the server has the
/// data. Not shown in release builds.
class DemoModeSwitch extends ConsumerWidget {
  const DemoModeSwitch({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (kReleaseMode) return const SizedBox.shrink();
    final demo = ref.watch(demoModeProvider);
    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: Material(
        color: demo ? AppColors.yellow50 : AppColors.surface,
        shape: RoundedRectangleBorder(
          side: BorderSide(
            color: demo ? AppColors.yellow300 : AppColors.border,
          ),
          borderRadius: BorderRadius.circular(12),
        ),
        clipBehavior: Clip.antiAlias,
        child: SwitchListTile(
          key: const Key('demo-switch'),
          value: demo,
          onChanged: ref.read(demoModeProvider.notifier).set,
          title: Text('Demo data', style: AppText.textSmSemibold),
          subtitle: Text(
            demo
                ? 'Pretend trips, no server. Sign in with any phone and a '
                      '6+ character password.'
                : 'Using the real server.',
            style: AppText.textXsRegular.copyWith(
              color: AppColors.inkSecondary,
            ),
          ),
        ),
      ),
    );
  }
}
