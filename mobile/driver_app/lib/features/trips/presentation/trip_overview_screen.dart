import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/error_message.dart';
import '../../../core/clock.dart';
import '../../../core/connectivity/online_provider.dart';
import '../../../core/format.dart';
import '../../../core/router/routes.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/connection_label.dart';
import '../application/trip_actions.dart';
import '../data/trips_providers.dart';
import '../domain/order.dart';
import '../domain/shortfall_report.dart';
import '../domain/stop.dart';
import '../domain/trip.dart';
import '../domain/stop_gate.dart';
import 'widgets/loading_banner.dart';
import 'widgets/start_code_dialog.dart';
import 'widgets/temperature_chip.dart';

const _interLabel = TextStyle(fontFamily: 'Inter', fontSize: 11);

/// Trip overview before and during the run (Figma "Trip details & departure"):
/// summary, loading result, unloading sequence and the "Ready to depart" call.
class TripOverviewScreen extends ConsumerStatefulWidget {
  const TripOverviewScreen({super.key, required this.tripId});

  final String tripId;

  @override
  ConsumerState<TripOverviewScreen> createState() => _TripOverviewScreenState();
}

class _TripOverviewScreenState extends ConsumerState<TripOverviewScreen> {
  bool _busy = false;

  Future<void> _depart(Trip trip) async {
    String? otp;
    if (ref.read(tripsRepositoryProvider).usesCodes) {
      // The start code is checked by the server, and it is when the trip
      // starts that each outlet is texted its delivery code and the phone is
      // given what it needs to check those codes without a signal.
      if (!ref.read(onlineProvider)) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              "You need a connection to start the trip. Once it "
              "has started, the rest works without one.",
            ),
          ),
        );
        return;
      }
      otp = await askStartCode(context);
      if (otp == null || !mounted) return;
    }
    setState(() => _busy = true);
    try {
      await ref.read(tripActionsProvider).startTrip(widget.tripId, otp: otp);
      final updated = await ref.read(tripProvider(widget.tripId).future);
      final stop = updated.activeStop;
      if (!mounted) return;
      context.go(
        stop == null
            ? AppRoutes.trip(widget.tripId)
            : AppRoutes.stop(widget.tripId, stop.id),
      );
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final data = ref.watch(tripProvider(widget.tripId));
    final vehicle = ref.watch(vehicleProvider).value;
    final now = ref.watch(clockProvider)();

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          _Header(
            plate: vehicle?.plate ?? '',
            onBack: () => context.go(AppRoutes.trips),
          ),
          Expanded(
            child: AsyncValueView(
              value: data,
              onRetry: () => ref.invalidate(tripProvider(widget.tripId)),
              data: (trip) => Column(
                children: [
                  Expanded(
                    child: RefreshIndicator(
                      onRefresh: () async {
                        ref.invalidate(tripProvider(widget.tripId));
                        await ref.read(tripProvider(widget.tripId).future);
                      },
                      child: SingleChildScrollView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            _SummaryCard(
                              trip: trip,
                              vehicleType: vehicle?.type ?? '',
                              now: now,
                            ),
                            const SizedBox(height: 16),
                            _LoadingSection(
                              trip: trip,
                              onSimulateLoaded:
                                  ref.read(tripsRepositoryProvider).usesCodes
                                  ? null
                                  : () => ref
                                        .read(tripActionsProvider)
                                        .simulateLoadingComplete(trip.id),
                            ),
                            const SizedBox(height: 16),
                            _Sequence(
                              trip: trip,
                              onOpen: (s) =>
                                  context.go(AppRoutes.stop(trip.id, s.id)),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  _ActionArea(
                    trip: trip,
                    busy: _busy,
                    onPressed: () {
                      if (trip.status == TripStatus.inProgress) {
                        final stop = trip.activeStop;
                        if (stop != null) {
                          context.go(AppRoutes.stop(trip.id, stop.id));
                        }
                      } else {
                        _depart(trip);
                      }
                    },
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
                      'assets/images/back_arrow.svg',
                      width: 18,
                      height: 14,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'My trips',
                      style: AppText.outfit(15, AppColors.ink, weight: 600),
                    ),
                  ],
                ),
              ),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.background,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.local_shipping_rounded,
                          size: 16,
                          color: AppColors.ink,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          plate,
                          style: const TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppColors.ink,
                          ),
                        ),
                      ],
                    ),
                  ),
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

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({
    required this.trip,
    required this.vehicleType,
    required this.now,
  });

  final Trip trip;
  final String vehicleType;
  final DateTime now;

  @override
  Widget build(BuildContext context) {
    final updatedAt = trip.updatedAt;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.card,
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(trip.name, style: AppText.displayXs),
              if (vehicleType.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.yellow100,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    vehicleType,
                    style: _interLabel.copyWith(
                      fontWeight: FontWeight.w600,
                      color: AppColors.ink,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            trip.subtitle,
            style: AppText.textSmRegular.copyWith(
              color: AppColors.inkSecondary,
            ),
          ),
          const SizedBox(height: 12),
          const Divider(height: 1, thickness: 1, color: AppColors.border),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _Stat(label: 'DEPARTURE', value: formatTime(trip.departure)),
              const _VerticalRule(),
              _Stat(label: 'STOPS', value: '${trip.stops.length} Stops'),
              const _VerticalRule(),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    'PLAN VERSION',
                    style: _interLabel.copyWith(
                      fontWeight: FontWeight.w500,
                      color: AppColors.inkMuted,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Plan v${trip.planVersion}',
                    style: const TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.blue700,
                    ),
                  ),
                ],
              ),
            ],
          ),
          if (updatedAt != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(4),
              ),
              child: Row(
                children: [
                  SvgPicture.asset(
                    'assets/images/refresh_cw.svg',
                    width: 14,
                    height: 14,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Plan v${trip.planVersion} · Updated ${formatNotificationTime(updatedAt, now)}',
                      style: const TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 12,
                        color: AppColors.inkSecondary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: _interLabel.copyWith(
            fontWeight: FontWeight.w500,
            color: AppColors.inkMuted,
          ),
        ),
        const SizedBox(height: 4),
        Text(value, style: AppText.textLgSemibold),
      ],
    );
  }
}

class _VerticalRule extends StatelessWidget {
  const _VerticalRule();

  @override
  Widget build(BuildContext context) =>
      Container(width: 1, height: 32, color: AppColors.border);
}

class _LoadingSection extends StatelessWidget {
  const _LoadingSection({required this.trip, required this.onSimulateLoaded});

  final Trip trip;
  final VoidCallback? onSimulateLoaded;

  bool get _loaded =>
      trip.status != TripStatus.loading && trip.status != TripStatus.assigned;

  @override
  Widget build(BuildContext context) {
    final shortfall = trip.shortfall;
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: AppColors.card,
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (!_loaded)
            // Long-press stands in for the loading team finishing (demo only).
            GestureDetector(
              key: const Key('loading-banner'),
              onLongPress: onSimulateLoaded,
              child: const LoadingBanner(),
            )
          else ...[
            Container(
              color: AppColors.lime100,
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  SvgPicture.asset(
                    'assets/images/loading_complete.svg',
                    width: 24,
                    height: 24,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Loading complete', style: AppText.textSmSemibold),
                        const SizedBox(height: 2),
                        const Text(
                          'All cargo palletized and loaded',
                          style: TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 12,
                            color: AppColors.inkSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            if (shortfall != null) _ShortfallBlock(shortfall: shortfall),
          ],
        ],
      ),
    );
  }
}

class _ShortfallBlock extends StatelessWidget {
  const _ShortfallBlock({required this.shortfall});

  final ShortfallReport shortfall;

  @override
  Widget build(BuildContext context) {
    const base = TextStyle(
      fontFamily: 'Inter',
      fontSize: 12,
      fontWeight: FontWeight.w500,
      height: 1.4,
      color: AppColors.ink,
    );
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(
        color: AppColors.red50,
        border: Border(top: BorderSide(color: AppColors.red100)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              SvgPicture.asset(
                'assets/images/alert_triangle.svg',
                width: 16,
                height: 16,
              ),
              const SizedBox(width: 8),
              const Text(
                'SHORTFALL REPORTED',
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: AppColors.red700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text.rich(
            TextSpan(
              style: base,
              children: [
                TextSpan(
                  text: '${shortfall.orderId} (${shortfall.storeName}): ',
                ),
                TextSpan(
                  text:
                      '${shortfall.shortCases} of ${shortfall.plannedCases} cases short',
                  style: base.copyWith(fontWeight: FontWeight.w700),
                ),
                const TextSpan(text: '.'),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.card,
              border: Border.all(color: AppColors.red100),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Row(
              children: [
                SvgPicture.asset(
                  'assets/images/user_square.svg',
                  width: 12,
                  height: 12,
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'Dispatcher: ${shortfall.dispatcherNote}',
                    style: _interLabel.copyWith(
                      fontWeight: FontWeight.w500,
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

class _Sequence extends StatelessWidget {
  const _Sequence({required this.trip, required this.onOpen});

  final Trip trip;
  final ValueChanged<Stop> onOpen;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'UNLOADING SEQUENCE (${trip.stops.length} STOPS)',
          style: const TextStyle(
            fontFamily: 'Inter',
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: AppColors.inkMuted,
          ),
        ),
        const SizedBox(height: 10),
        for (var i = 0; i < trip.stops.length; i++) ...[
          if (i > 0) const SizedBox(height: 10),
          _StopCard(
            stop: trip.stops[i],
            locked:
                stopGate(trip, trip.stops[i]).access != StopAccess.actionable &&
                !stopGate(trip, trip.stops[i]).isDone,
            onTap: () => onOpen(trip.stops[i]),
          ),
        ],
      ],
    );
  }
}

class _StopCard extends StatelessWidget {
  const _StopCard({
    required this.stop,
    required this.onTap,
    this.locked = false,
  });

  final Stop stop;
  final bool locked;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final temperatures = <Temperature>[];
    for (final o in stop.orders) {
      if (!temperatures.contains(o.temperature)) {
        temperatures.add(o.temperature);
      }
    }
    final done = stop.status == StopStatus.completed;
    return Opacity(
      opacity: locked ? 0.55 : 1,
      child: Material(
        color: AppColors.card,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppColors.border),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Container(
                  key: done ? Key('stop-done-${stop.sequence}') : null,
                  width: 28,
                  height: 28,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: done ? AppColors.lime100 : AppColors.background,
                    shape: BoxShape.circle,
                  ),
                  child: done
                      ? const Icon(
                          Icons.check_rounded,
                          size: 16,
                          color: AppColors.lime700,
                        )
                      : Text(
                          '${stop.sequence}',
                          style: const TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: AppColors.ink,
                          ),
                        ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(stop.name, style: AppText.textSmSemibold),
                      const SizedBox(height: 4),
                      Wrap(
                        spacing: 12,
                        children: [
                          Text(
                            'Window: ${stop.deliveryWindow.replaceAll('-', '–')}',
                            style: _interLabel.copyWith(
                              color: AppColors.inkMuted,
                            ),
                          ),
                          Text(
                            'Arrival: ${formatTime(stop.plannedArrival)}',
                            style: _interLabel.copyWith(
                              fontWeight: FontWeight.w600,
                              color: AppColors.lime700,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              for (final t in temperatures) ...[
                                TemperatureChip(t),
                                const SizedBox(width: 4),
                              ],
                            ],
                          ),
                          Text(
                            '${stop.orders.length} ${stop.orders.length == 1 ? 'order' : 'orders'}',
                            style: _interLabel.copyWith(
                              fontWeight: FontWeight.w500,
                              color: AppColors.inkSecondary,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ActionArea extends StatelessWidget {
  const _ActionArea({
    required this.trip,
    required this.busy,
    required this.onPressed,
  });

  final Trip trip;
  final bool busy;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final status = trip.status;
    if (status == TripStatus.completed) return const SizedBox.shrink();

    final loading =
        status == TripStatus.loading || status == TripStatus.assigned;
    final underway = status == TripStatus.inProgress;
    final caption = loading
        ? 'Waiting for the loading team to finish'
        : underway
        ? 'Trip in progress · Plan v${trip.planVersion}'
        : 'Load confirmed · Plan v${trip.planVersion} acknowledged';

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      decoration: const BoxDecoration(
        color: AppColors.card,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          AppButton(
            label: underway ? 'Continue trip' : 'Ready to depart',
            bold: true,
            padding: 14,
            radius: 8,
            isLoading: busy,
            // Figma's exported play-circle SVG lost its triangle, so the
            // Material icon stands in until it is re-exported.
            leadingIcon: underway ? null : Icons.play_circle_outline_rounded,
            onPressed: loading ? null : onPressed,
          ),
          const SizedBox(height: 8),
          Text(
            caption,
            textAlign: TextAlign.center,
            style: _interLabel.copyWith(
              fontWeight: FontWeight.w500,
              color: AppColors.inkSecondary,
            ),
          ),
        ],
      ),
    );
  }
}
