import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/clock.dart';
import '../../../core/connectivity/online_provider.dart';
import '../../../core/router/trip_destination.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/widgets/app_header.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/day_selector.dart';
import '../../../core/widgets/online_status_pill.dart';
import '../../assistant/presentation/widgets/copilot_mark.dart';
import '../../sync/presentation/sync_status_bar.dart';
import '../../tracking/presentation/location_notice.dart';
import '../data/trips_providers.dart';
import '../domain/trip.dart';
import '../domain/vehicle.dart';
import 'widgets/trip_card.dart';
import 'widgets/vehicle_banner.dart';

class MyTripsScreen extends ConsumerWidget {
  const MyTripsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final trips = ref.watch(tripsProvider);
    final vehicle = ref.watch(vehicleProvider);
    final day = ref.watch(tripsDateProvider);
    final now = ref.watch(clockProvider)();
    void retry() {
      ref.invalidate(tripsProvider);
      ref.invalidate(vehicleProvider);
    }

    return Scaffold(
      // Bottom-right, just above the footer.
      floatingActionButtonLocation: const _TightEndFloat(),
      floatingActionButton: CopilotButton(onTap: () => context.push('/chat')),
      body: Column(
        children: [
          AppHeader(onBellTap: () => context.go('/updates')),
          const _TitleRow(),
          DaySelector(
            day: day,
            today: now,
            onChanged: ref.read(tripsDateProvider.notifier).set,
          ),
          const SyncStatusBar(),
          const LocationNotice(),
          Expanded(
            child: AsyncValueView(
              value: trips,
              onRetry: retry,
              isEmpty: (t) => t.isEmpty,
              emptyMessage: 'No trips assigned',
              data: (tripList) => AsyncValueView(
                value: vehicle,
                onRetry: retry,
                data: (v) => _Content(vehicle: v, trips: tripList),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TitleRow extends ConsumerWidget {
  const _TitleRow();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final online = ref.watch(onlineProvider);
    return Container(
      color: AppColors.surface,
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Flexible(
            child: Text(
              'My trips',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AppText.displaySm,
            ),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              const OnlineStatusPill(),
              if (online) ...[
                const SizedBox(height: 4),
                Text(
                  'Synced just now',
                  style: AppText.textXsRegular.copyWith(
                    color: AppColors.inkMuted,
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

class _Content extends ConsumerWidget {
  const _Content({required this.vehicle, required this.trips});

  final Vehicle vehicle;
  final List<Trip> trips;

  void _open(BuildContext context, WidgetRef ref, Trip trip) {
    context.go(tripDestination(trip, online: ref.read(onlineProvider)));
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(tripsProvider);
        await ref.read(tripsProvider.future);
      },
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        // Room under the last card for the floating Trip Copilot button.
        padding: const EdgeInsets.only(bottom: 88),
        children: [
          VehicleBanner(vehicle: vehicle),
          Padding(
            padding: const EdgeInsets.all(8),
            child: Column(
              children: [
                for (var i = 0; i < trips.length; i++) ...[
                  if (i > 0) const SizedBox(height: 8),
                  TripCard(
                    trip: trips[i],
                    highlighted: i == 0,
                    onViewTrip: () => _open(context, ref, trips[i]),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Bottom-right like the standard end-float spot, but with the same 8 px side
/// margin the trip cards have (the default is 16), and a little closer to the
/// footer, so the button lines up with the page content.
class _TightEndFloat extends FloatingActionButtonLocation {
  const _TightEndFloat();

  static const side = 8.0;
  static const bottom = 12.0;

  @override
  Offset getOffset(ScaffoldPrelayoutGeometry geometry) => Offset(
    geometry.scaffoldSize.width -
        geometry.floatingActionButtonSize.width -
        side,
    geometry.contentBottom - geometry.floatingActionButtonSize.height - bottom,
  );
}
