import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';

import '../../../core/connectivity/online_provider.dart';
import '../../../core/format.dart';
import '../../../core/router/routes.dart';
import '../../../core/router/trip_destination.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/connection_label.dart';
import '../../../core/widgets/info_tile.dart';
import '../../../core/widgets/label_chip.dart';
import '../../records/data/records_providers.dart';
import '../../records/domain/saved_record.dart';
import '../../route_update/data/route_changes_providers.dart';
import '../../sync/presentation/sync_status_bar.dart';
import '../../trips/data/trips_providers.dart';
import '../../trips/domain/stop.dart';
import '../../trips/domain/stop_gate.dart';
import '../../trips/domain/trip.dart';

/// The trip as saved on the device (Figma "driver-offline-records-sync"):
/// what can still be done without a connection and what is waiting to sync.
class OfflineTripScreen extends ConsumerWidget {
  const OfflineTripScreen({super.key, required this.tripId});

  final String tripId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final data = ref.watch(tripProvider(tripId));
    final plate = ref.watch(vehicleProvider).value?.plate ?? '';
    final online = ref.watch(onlineProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          _Header(plate: plate, onBack: () => context.go(AppRoutes.trips)),
          const SyncStatusBar(),
          Expanded(
            child: AsyncValueView(
              value: data,
              onRetry: () => ref.invalidate(tripProvider(tripId)),
              data: (trip) => SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (!online) ...[
                      _Banner(trip: trip),
                      const SizedBox(height: 12),
                    ],
                    _NextStopCard(trip: trip),
                    const SizedBox(height: 12),
                    _RecordsCard(tripId: tripId),
                    const SizedBox(height: 12),
                    AppButton(
                      label: 'View saved trip',
                      dense: true,
                      // A trip that has not started opens its overview, never a
                      // stop it cannot work on yet.
                      onPressed: () =>
                          context.go(tripDestination(trip, online: true)),
                    ),
                    const SizedBox(height: 12),
                    _RouteUpdateNotice(tripId: tripId),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.plate, required this.onBack});

  final String plate;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.card,
        border: Border(bottom: BorderSide(color: AppColors.border)),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              InkWell(
                key: const Key('back-link'),
                onTap: onBack,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SvgPicture.asset(
                      'assets/images/arrow_left.svg',
                      width: 23,
                      height: 23,
                    ),
                    const SizedBox(width: 11),
                    Text(
                      'My trips',
                      style: AppText.outfit(15.5, AppColors.ink),
                    ),
                  ],
                ),
              ),
              Row(
                children: [
                  const Icon(
                    Icons.local_shipping_rounded,
                    size: 28,
                    color: AppColors.inkSecondary,
                  ),
                  const SizedBox(width: 4),
                  Text(plate, style: AppText.textSmSemibold),
                  const SizedBox(width: 8),
                  const ConnectionLabel(),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Banner extends StatelessWidget {
  const _Banner({required this.trip});

  final Trip trip;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.red50,
        border: Border.all(color: AppColors.red100),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.error_rounded,
            size: 28,
            color: AppColors.inkSecondary,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('No connection', style: AppText.textSmBold),
                const SizedBox(height: 4),
                Text(
                  '${trip.name} route and stop details were downloaded and are available on this device.',
                  style: AppText.textXsRegular.copyWith(
                    color: AppColors.inkSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _NextStopCard extends StatelessWidget {
  const _NextStopCard({required this.trip});

  final Trip trip;

  @override
  Widget build(BuildContext context) {
    final stop = trip.activeStop;
    // Before the trip is on the road no stop is workable: say why instead of
    // promising offline arrivals and proof.
    final gate = stop == null ? null : stopGate(trip, stop);
    final waiting = gate != null && !gate.canAct;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.card,
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(12),
      ),
      child: stop == null
          ? Text(
              'All stops on this trip are complete.',
              style: AppText.textSmRegular,
            )
          : waiting
          ? Column(
              key: const Key('offline-trip-waiting'),
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(gate.title, style: AppText.displayXs),
                const SizedBox(height: 4),
                Text(
                  gate.message,
                  style: AppText.textSmRegular.copyWith(
                    color: AppColors.inkSecondary,
                  ),
                ),
              ],
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  '${stop.status == StopStatus.pending ? 'NEXT STOP · ' : 'STOP '}${stop.sequence} OF ${trip.stops.length}',
                  style: AppText.textXsRegular.copyWith(
                    color: AppColors.inkSecondary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(stop.name, style: AppText.displayXs),
                const SizedBox(height: 16),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: InfoTile(
                        icon: Icons.schedule_rounded,
                        label: 'Delivery window',
                        value: stop.deliveryWindow,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Expanded(
                      child: InfoTile(
                        icon: Icons.calendar_today_rounded,
                        label: 'Planned arrival',
                        value: formatTime(stop.plannedArrival),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.card,
                    border: Border.all(color: AppColors.border),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.info_outline_rounded,
                        size: 18,
                        color: AppColors.inkSecondary,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'You can continue recording arrivals, issues, and proof of delivery while offline.',
                          style: AppText.textXsRegular.copyWith(
                            color: AppColors.inkSecondary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}

class _RecordsCard extends ConsumerWidget {
  const _RecordsCard({required this.tripId});

  final String tripId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final records = ref.watch(recordsProvider(tripId));
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.card,
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Records saved on this device', style: AppText.textSmBold),
          const SizedBox(height: 12),
          AsyncValueView(
            value: records,
            onRetry: () => ref.invalidate(recordsProvider(tripId)),
            isEmpty: (l) => l.isEmpty,
            emptyMessage: 'Nothing saved yet',
            data: (list) => Column(
              children: [
                for (var i = 0; i < list.length; i++) ...[
                  if (i > 0) const SizedBox(height: 8),
                  _RecordRow(record: list[i]),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _RecordRow extends StatelessWidget {
  const _RecordRow({required this.record});

  final SavedRecord record;

  IconData get _icon => switch (record.kind) {
    RecordKind.arrival => Icons.check_circle_rounded,
    RecordKind.issue => Icons.error_rounded,
    RecordKind.proof => Icons.photo_camera_rounded,
  };

  @override
  Widget build(BuildContext context) {
    final waiting = record.syncState == SyncState.waitingToSync;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(_icon, size: 28, color: AppColors.inkSecondary),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(record.title, style: AppText.textSmSemibold),
                const SizedBox(height: 2),
                Text(
                  'Saved ${formatTime(record.savedAt)}',
                  style: AppText.textXsRegular.copyWith(
                    color: AppColors.inkMuted,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          LabelChip(
            label: waiting ? 'Waiting to sync' : 'Synced',
            background: waiting ? AppColors.yellow100 : AppColors.background,
            foreground: waiting ? AppColors.yellow700 : AppColors.neutral600,
          ),
        ],
      ),
    );
  }
}

class _RouteUpdateNotice extends ConsumerWidget {
  const _RouteUpdateNotice({required this.tripId});

  final String tripId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final change = ref.watch(routeChangeProvider(tripId)).value;
    if (change == null || change.acknowledged) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.yellow50,
        border: Border.all(color: AppColors.yellow300),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const Icon(
                Icons.warning_rounded,
                size: 24,
                color: AppColors.yellow600,
              ),
              const SizedBox(width: 8),
              Text('Route update available', style: AppText.textSmBold),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'The dispatcher updated the stop sequence for Trip 1 while you were offline. '
            'Review the changes before accepting — your completed stop records will not be overwritten.',
            style: AppText.textXsRegular.copyWith(
              color: AppColors.inkSecondary,
            ),
          ),
          const SizedBox(height: 12),
          AppButton(
            label: 'Review changes',
            variant: AppButtonVariant.outlined,
            dense: true,
            trailingIcon: Icons.arrow_forward_rounded,
            onPressed: () => context.go(AppRoutes.routeUpdate(tripId)),
          ),
        ],
      ),
    );
  }
}
