import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/connectivity/online_provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/widgets/app_header.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/status_pill.dart';
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
    void retry() {
      ref.invalidate(tripsProvider);
      ref.invalidate(vehicleProvider);
    }

    return Scaffold(
      body: Column(
        children: [
          AppHeader(onBellTap: () => context.go('/updates')),
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

class _Content extends ConsumerWidget {
  const _Content({required this.vehicle, required this.trips});

  final Vehicle vehicle;
  final List<Trip> trips;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final online = ref.watch(onlineProvider);
    return ListView(
      padding: EdgeInsets.zero,
      children: [
        Container(
          color: AppColors.surface,
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Flexible(
                child: Text('My trips',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppText.displaySm),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  StatusPill(
                    label: online ? 'Online' : 'Offline',
                    kind: online ? StatusKind.success : StatusKind.neutral,
                    onLongPress: () =>
                        ref.read(onlineProvider.notifier).toggle(),
                  ),
                  if (online) ...[
                    const SizedBox(height: 4),
                    Text('Synced just now',
                        style: AppText.textXsRegular
                            .copyWith(color: AppColors.inkMuted)),
                  ],
                ],
              ),
            ],
          ),
        ),
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
                  // Trip details screen is built in the next plan.
                  onViewTrip: () {},
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}
