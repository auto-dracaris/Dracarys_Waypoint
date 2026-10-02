import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';

import '../../../core/format.dart';
import '../../../core/router/routes.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/back_bar.dart';
import '../../../core/widgets/info_tile.dart';
import '../../../core/widgets/map_sheet_layout.dart';
import '../../../core/widgets/map_view.dart';
import '../../../core/widgets/stop_progress.dart';
import '../../../core/widgets/vehicle_row.dart';
import '../../trips/application/trip_actions.dart';
import '../../trips/data/trips_providers.dart';
import '../../trips/domain/stop.dart';
import '../../trips/domain/trip.dart';
import 'widgets/orders_panel.dart';

/// Stop overview (Figma "3 — Trip Details / Stop Overview" and the order-list
/// variant): progress, map, and the next stop's details and actions.
class StopInfoScreen extends ConsumerStatefulWidget {
  const StopInfoScreen({super.key, required this.tripId, required this.stopId});

  final String tripId;
  final String stopId;

  @override
  ConsumerState<StopInfoScreen> createState() => _StopInfoScreenState();
}

class _StopInfoScreenState extends ConsumerState<StopInfoScreen> {
  bool _ordersExpanded = false;
  bool _busy = false;

  StopRef get _ref => (tripId: widget.tripId, stopId: widget.stopId);

  Future<void> _markArrived() async {
    setState(() => _busy = true);
    try {
      await ref.read(tripActionsProvider).markArrived(widget.tripId);
      if (mounted) {
        context.go(AppRoutes.arrived(widget.tripId, widget.stopId));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final data = ref.watch(tripStopProvider(_ref));
    final plate = ref.watch(vehicleProvider).value?.plate ?? '';

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          BackBar(onBack: () => context.go(AppRoutes.trips)),
          Expanded(
            child: AsyncValueView(
              value: data,
              onRetry: () => ref.invalidate(tripStopProvider(_ref)),
              data: (d) => SingleChildScrollView(
                child: Column(
                  children: [
                    VehicleRow(plate: plate),
                    const Divider(
                        height: 1, thickness: 1, color: Color(0xFFE8E8E8)),
                    StopProgress(
                      completed: d.trip.completedStops,
                      total: d.trip.stops.length,
                      // "All stops" opens the trip overview (added with it).
                      onAllStops: () {},
                    ),
                    MapSheetLayout(
                      map: MapView(
                        center: LatLng(d.stop.lat, d.stop.lng),
                        zoom: 13,
                        markers: [
                          MapMarker(
                            point: LatLng(d.stop.lat, d.stop.lng),
                            child: const Icon(Icons.location_on,
                                size: 40, color: AppColors.red700),
                          ),
                        ],
                      ),
                      sheet: _Sheet(
                        trip: d.trip,
                        stop: d.stop,
                        ordersExpanded: _ordersExpanded,
                        onToggleOrders: () => setState(
                            () => _ordersExpanded = !_ordersExpanded),
                        busy: _busy,
                        onDirections: () => context.go(
                            AppRoutes.navigate(widget.tripId, widget.stopId)),
                        onMarkArrived: _markArrived,
                        onContinue: () => context.go(
                            AppRoutes.arrived(widget.tripId, widget.stopId)),
                      ),
                    ),
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

class _Sheet extends StatelessWidget {
  const _Sheet({
    required this.trip,
    required this.stop,
    required this.ordersExpanded,
    required this.onToggleOrders,
    required this.busy,
    required this.onDirections,
    required this.onMarkArrived,
    required this.onContinue,
  });

  final Trip trip;
  final Stop stop;
  final bool ordersExpanded;
  final VoidCallback onToggleOrders;
  final bool busy;
  final VoidCallback onDirections;
  final VoidCallback onMarkArrived;
  final VoidCallback onContinue;

  @override
  Widget build(BuildContext context) {
    final prefix = stop.status == StopStatus.pending ? 'NEXT STOP · ' : 'STOP ';
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('$prefix${stop.sequence} OF ${trip.stops.length}',
              style: AppText.textXsRegular
                  .copyWith(color: AppColors.inkSecondary)),
          Text(stop.name, style: AppText.displayXs),
          const SizedBox(height: 24),
          Row(
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
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              border: Border.all(color: AppColors.border),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                const Icon(Icons.warehouse_rounded,
                    size: 18, color: AppColors.inkSecondary),
                const SizedBox(width: 10),
                Expanded(child: Text(stop.dock, style: AppText.textSmRegular)),
              ],
            ),
          ),
          const SizedBox(height: 12),
          OrdersPanel(
            orders: stop.orders,
            expanded: ordersExpanded,
            onToggle: onToggleOrders,
          ),
          const SizedBox(height: 12),
          AppButton(
            label: 'Get Directions',
            variant: AppButtonVariant.outlined,
            leadingIcon: Icons.send_rounded,
            onPressed: onDirections,
          ),
          const SizedBox(height: 6),
          switch (stop.status) {
            StopStatus.pending => AppButton(
                label: 'Mark arrived',
                isLoading: busy,
                onPressed: onMarkArrived,
              ),
            StopStatus.arrived => AppButton(
                label: 'Continue delivery',
                onPressed: onContinue,
              ),
            StopStatus.completed => const SizedBox.shrink(),
          },
        ],
      ),
    );
  }
}
