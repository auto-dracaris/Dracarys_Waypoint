import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/connectivity/online_provider.dart';
import '../../../core/demo_mode.dart';
import '../../../core/format.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text.dart';
import '../../tracking/application/location_tracker.dart';
import '../application/sync_service.dart';
import '../domain/pending_action.dart';

/// Tells the driver what has not reached the dispatcher yet. Hidden when
/// everything is sent. Tapping it lists each item, with the reason when the
/// server turned one down.
class SyncStatusBar extends ConsumerWidget {
  const SyncStatusBar({super.key});

  /// More location points than this waiting is shown even when online.
  static const pointsWorthShowing = 25;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sync = ref.watch(syncServiceProvider);
    final online = ref.watch(onlineProvider);
    final points = ref.watch(locationTrackerProvider.select((s) => s.pending));
    // Location points flow out every few seconds, so one or two waiting is normal
    // and not worth a bar. Offline, or a real pile, is.
    final showPoints = points > 0 && (!online || points > pointsWorthShowing);
    if ((sync.isEmpty && !showPoints) || ref.watch(demoModeProvider)) {
      return const SizedBox.shrink();
    }

    final refused = sync.rejected.length;
    final waiting = sync.pending.length;
    final problem = refused > 0;

    final text = [
      if (waiting > 0)
        '$waiting ${waiting == 1 ? 'change' : 'changes'} waiting to sync',
      if (refused > 0) '$refused not accepted by the server',
      if (showPoints)
        '$points location ${points == 1 ? 'point' : 'points'} waiting',
    ].join(' · ');

    return Material(
      color: problem ? AppColors.red50 : AppColors.yellow50,
      child: InkWell(
        key: const Key('sync-status'),
        onTap: () => showModalBottomSheet<void>(
          context: context,
          isScrollControlled: true,
          backgroundColor: AppColors.card,
          showDragHandle: true,
          builder: (_) => const _SyncSheet(),
        ),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            border: Border(
              top: BorderSide(
                color: problem ? AppColors.red200 : AppColors.yellow300,
              ),
              bottom: BorderSide(
                color: problem ? AppColors.red200 : AppColors.yellow300,
              ),
            ),
          ),
          child: Row(
            children: [
              if (sync.syncing)
                const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              else
                Icon(
                  problem ? Icons.error_outline : Icons.cloud_upload_outlined,
                  size: 18,
                  color: problem ? AppColors.red700 : AppColors.yellow700,
                ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  online || problem ? text : '$text · will send when online',
                  key: const Key('sync-status-text'),
                  style: AppText.textSmMedium.copyWith(
                    color: problem ? AppColors.red700 : AppColors.ink,
                  ),
                ),
              ),
              const Icon(
                Icons.chevron_right_rounded,
                size: 20,
                color: AppColors.inkMuted,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SyncSheet extends ConsumerWidget {
  const _SyncSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sync = ref.watch(syncServiceProvider);
    final online = ref.watch(onlineProvider);
    final points = ref.watch(locationTrackerProvider.select((s) => s.pending));
    return SafeArea(
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.7,
        ),
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          children: [
            Text('Sync', style: AppText.textLgSemibold),
            const SizedBox(height: 4),
            Text(
              online
                  ? 'Everything here is saved on this phone.'
                  : 'No connection. Everything here is saved on this phone and '
                        'will be sent as soon as you are back online.',
              style: AppText.textSmRegular.copyWith(
                color: AppColors.inkSecondary,
              ),
            ),
            const SizedBox(height: 12),
            if (points > 0)
              Container(
                key: const Key('location-backlog'),
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  border: Border.all(color: AppColors.border),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.my_location_rounded,
                      size: 20,
                      color: AppColors.inkSecondary,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        '$points vehicle location ${points == 1 ? 'point' : 'points'} '
                        'waiting to be sent to the dispatcher',
                        style: AppText.textSmSemibold,
                      ),
                    ),
                  ],
                ),
              ),
            for (final a in sync.rejected) _Row(action: a, refused: true),
            for (final a in sync.pending) _Row(action: a, refused: false),
            const SizedBox(height: 8),
            FilledButton.icon(
              key: const Key('sync-now'),
              onPressed: sync.syncing || (sync.pending.isEmpty && points == 0)
                  ? null
                  : () {
                      ref.read(syncServiceProvider.notifier).kick();
                      ref
                          .read(locationTrackerProvider.notifier)
                          .flush(force: true);
                    },
              icon: const Icon(Icons.sync_rounded),
              label: Text(sync.syncing ? 'Syncing…' : 'Sync now'),
            ),
          ],
        ),
      ),
    );
  }
}

class _Row extends ConsumerWidget {
  const _Row({required this.action, required this.refused});

  final PendingAction action;
  final bool refused;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stop = action.meta['stopName'];
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: refused ? AppColors.red50 : AppColors.surface,
        border: Border.all(
          color: refused ? AppColors.red200 : AppColors.border,
        ),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            refused ? Icons.error_outline : Icons.schedule_rounded,
            size: 20,
            color: refused ? AppColors.red700 : AppColors.inkSecondary,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  stop == null ? action.title : '${action.title} · $stop',
                  style: AppText.textSmSemibold,
                ),
                Text(
                  formatTime(action.createdAt),
                  style: AppText.textXsRegular.copyWith(
                    color: AppColors.inkMuted,
                  ),
                ),
                if (refused && action.error != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      action.error!,
                      key: const Key('sync-error'),
                      style: AppText.textXsRegular.copyWith(
                        color: AppColors.red700,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          if (refused)
            TextButton(
              key: Key('dismiss-${action.id}'),
              onPressed: () =>
                  ref.read(syncServiceProvider.notifier).dismiss(action.id),
              child: const Text('Dismiss'),
            ),
        ],
      ),
    );
  }
}
