import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/format.dart';
import '../../../core/router/routes.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/quantity_stepper.dart';
import '../../../core/widgets/stop_progress.dart';
import '../../../core/widgets/trip_header_bar.dart';
import '../../trips/data/trips_providers.dart';
import '../../trips/domain/order.dart';
import '../../trips/domain/stop.dart';
import '../../trips/presentation/widgets/temperature_chip.dart';
import 'delivered_quantities.dart';

/// Arrived at a stop (Figma "driver-stop-arrival-delivery-details"): confirm
/// the quantities handed over, then continue to proof of delivery.
class ArrivedScreen extends ConsumerWidget {
  const ArrivedScreen({super.key, required this.tripId, required this.stopId});

  final String tripId;
  final String stopId;

  StopRef get _ref => (tripId: tripId, stopId: stopId);

  void _comingNext(BuildContext context, String what) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text('$what is coming next')));
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final data = ref.watch(tripStopProvider(_ref));
    final plate = ref.watch(vehicleProvider).value?.plate ?? '';

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          TripHeaderBar(
              plate: plate, onBack: () => context.go(AppRoutes.trips)),
          Expanded(
            child: AsyncValueView(
              value: data,
              onRetry: () => ref.invalidate(tripStopProvider(_ref)),
              data: (d) => Column(
                children: [
                  StopProgress(
                    completed: d.trip.completedStops,
                    total: d.trip.stops.length,
                    style: StopProgressStyle.stepper,
                    // "All stops" opens the trip overview (added with it).
                    onAllStops: () {},
                  ),
                  const Divider(
                      height: 1, thickness: 1, color: Color(0xFFE8E8E8)),
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          _StopCard(
                            stop: d.stop,
                            total: d.trip.stops.length,
                            onContact: () => ScaffoldMessenger.of(context)
                                .showSnackBar(SnackBar(
                                    content: Text(
                                        'Contact outlet: ${d.stop.contactPhone}'))),
                          ),
                          const SizedBox(height: 16),
                          _OrdersSection(orders: d.stop.orders),
                          const SizedBox(height: 16),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppColors.border,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              'Verify quantities match before continuing to proof of delivery.',
                              textAlign: TextAlign.center,
                              style: AppText.textXsRegular
                                  .copyWith(color: AppColors.inkSecondary),
                            ),
                          ),
                          const SizedBox(height: 16),
                          AppButton(
                            label: 'Continue to proof of delivery',
                            bold: true,
                            padding: 14,
                            trailingIcon: Icons.arrow_forward_rounded,
                            // Proof of delivery is built in the next chunk.
                            onPressed: () =>
                                _comingNext(context, 'Proof of delivery'),
                          ),
                          const SizedBox(height: 12),
                          AppButton(
                            label: 'Report an issue',
                            variant: AppButtonVariant.dangerOutlined,
                            leadingIcon: Icons.error_outline_rounded,
                            // The issue report is built in the next chunk.
                            onPressed: () =>
                                _comingNext(context, 'Issue reporting'),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StopCard extends StatelessWidget {
  const _StopCard({
    required this.stop,
    required this.total,
    required this.onContact,
  });

  final Stop stop;
  final int total;
  final VoidCallback onContact;

  @override
  Widget build(BuildContext context) {
    final arrivedAt = stop.arrivedAt;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'ARRIVED · STOP ${stop.sequence} OF $total',
            style: AppText.textXsRegular.copyWith(
                fontWeight: FontWeight.w600,
                fontVariations: const [FontVariation('wght', 600)],
                color: AppColors.errorPrimary),
          ),
          const SizedBox(height: 4),
          Text(stop.name, style: AppText.displayXs),
          const SizedBox(height: 14),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: _MiniTile(
                  label: 'Delivery window',
                  value: stop.deliveryWindow.replaceAll('-', '–'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _MiniTile(
                  label: 'Arrived at',
                  value: arrivedAt == null ? '—' : formatTime(arrivedAt),
                  valueColor: AppColors.lime700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.card,
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
          const SizedBox(height: 14),
          InkWell(
            onTap: onContact,
            child: Row(
              children: [
                const Icon(Icons.phone_rounded,
                    size: 16, color: AppColors.lime700),
                const SizedBox(width: 4),
                Text('Contact outlet',
                    style: AppText.textSmSemibold
                        .copyWith(color: AppColors.lime700)),
                const SizedBox(width: 4),
                Text('(when safely stopped)',
                    style: AppText.textXsRegular
                        .copyWith(color: AppColors.inkMuted)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MiniTile extends StatelessWidget {
  const _MiniTile({required this.label, required this.value, this.valueColor});

  final String label;
  final String value;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style:
                  AppText.textXsRegular.copyWith(color: AppColors.inkMuted)),
          const SizedBox(height: 4),
          Text(value,
              style: AppText.textSmBold
                  .copyWith(color: valueColor ?? AppColors.ink)),
        ],
      ),
    );
  }
}

class _OrdersSection extends StatelessWidget {
  const _OrdersSection({required this.orders});

  final List<Order> orders;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('${orders.length} ${orders.length == 1 ? 'order' : 'orders'}',
            style: AppText.textSmSemibold
                .copyWith(color: AppColors.inkSecondary)),
        const SizedBox(height: 10),
        for (var i = 0; i < orders.length; i++) ...[
          if (i > 0) const SizedBox(height: 10),
          _OrderCard(order: orders[i]),
        ],
      ],
    );
  }
}

class _OrderCard extends ConsumerWidget {
  const _OrderCard({required this.order});

  final Order order;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final delivered =
        ref.watch(deliveredQuantitiesProvider)[order.id] ?? order.cases;
    final handling = order.handling;
    return Container(
      key: Key('order-card-${order.id}'),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(order.id, style: AppText.textSmBold),
              TemperatureChip(order.temperature, delivery: true),
            ],
          ),
          const SizedBox(height: 12),
          Text('${order.cases} cases',
              style: AppText.textXsRegular
                  .copyWith(color: AppColors.inkSecondary)),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.only(top: 8),
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: AppColors.border)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Planned qty',
                        style: AppText.textXsRegular
                            .copyWith(color: AppColors.inkMuted)),
                    const SizedBox(height: 2),
                    Text('${order.cases}', style: AppText.textSmSemibold),
                  ],
                ),
                Row(
                  children: [
                    Text('Delivered',
                        style: AppText.textXsRegular
                            .copyWith(color: AppColors.inkSecondary)),
                    const SizedBox(width: 8),
                    QuantityStepper(
                      value: delivered,
                      min: 0,
                      max: order.cases,
                      onChanged: (v) => ref
                          .read(deliveredQuantitiesProvider.notifier)
                          .set(order.id, v),
                    ),
                  ],
                ),
              ],
            ),
          ),
          if (handling != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.blue100,
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text('Handling: $handling',
                  style: AppText.textXsRegular.copyWith(
                      fontWeight: FontWeight.w600,
                      fontVariations: const [FontVariation('wght', 600)],
                      color: AppColors.blue800)),
            ),
          ],
        ],
      ),
    );
  }
}
