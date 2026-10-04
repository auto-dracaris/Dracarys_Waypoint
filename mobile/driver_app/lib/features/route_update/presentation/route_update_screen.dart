import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/error_message.dart';
import '../../../core/clock.dart';
import '../../../core/format.dart';
import '../../../core/router/routes.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/connection_pill.dart';
import '../../trips/application/trip_actions.dart';
import '../../trips/data/trips_providers.dart';
import '../data/route_changes_providers.dart';
import '../domain/route_change.dart';

const _inter = TextStyle(fontFamily: 'Inter');

/// Route change review (Figma "driver-route-change-review"): what the
/// dispatcher reordered, what it does to arrival times, and an acknowledgement.
class RouteUpdateScreen extends ConsumerStatefulWidget {
  const RouteUpdateScreen({super.key, required this.tripId});

  final String tripId;

  @override
  ConsumerState<RouteUpdateScreen> createState() => _RouteUpdateScreenState();
}

class _RouteUpdateScreenState extends ConsumerState<RouteUpdateScreen> {
  bool _busy = false;

  Future<void> _acknowledge() async {
    setState(() => _busy = true);
    try {
      await ref.read(tripActionsProvider).acknowledgeRouteChange(widget.tripId);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Route acknowledged')));
      context.go(AppRoutes.updates);
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final data = ref.watch(routeChangeProvider(widget.tripId));
    final plate = ref.watch(vehicleProvider).value?.plate ?? '';
    final now = ref.watch(clockProvider)();

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          _TopNav(plate: plate, onBack: () => context.go(AppRoutes.updates)),
          Expanded(
            child: AsyncValueView(
              value: data,
              onRetry: () => ref.invalidate(routeChangeProvider(widget.tripId)),
              data: (change) {
                if (change == null) {
                  return const Center(child: Text('Something went wrong'));
                }
                return Column(
                  children: [
                    Expanded(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.all(16),
                        child: _Body(change: change, now: now),
                      ),
                    ),
                    _Actions(
                      acknowledged: change.acknowledged,
                      busy: _busy,
                      onAcknowledge: _acknowledge,
                      onViewTrip: () =>
                          context.go(AppRoutes.trip(widget.tripId)),
                    ),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _TopNav extends StatelessWidget {
  const _TopNav({required this.plate, required this.onBack});

  final String plate;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(bottom: BorderSide(color: AppColors.border)),
      ),
      child: SafeArea(
        bottom: false,
        child: SizedBox(
          height: 52,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
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
                      const SizedBox(width: 6),
                      Text(
                        'My trips',
                        style: AppText.outfit(14, AppColors.vehicleText),
                      ),
                    ],
                  ),
                ),
                Row(
                  children: [
                    Text(plate, style: AppText.textSmMedium),
                    const SizedBox(width: 8),
                    const ConnectionPill(compact: true),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({required this.change, required this.now});

  final RouteChange change;
  final DateTime now;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.yellow50,
            border: Border.all(color: AppColors.primary),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: const BoxDecoration(
                  color: AppColors.surface,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.autorenew,
                  size: 24,
                  color: AppColors.yellow600,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Route updated by dispatcher',
                      style: AppText.textSmBold,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Updated ${formatNotificationTime(change.updatedAt, now)} · Plan v${change.planVersion}',
                      style: AppText.textXsRegular.copyWith(
                        color: AppColors.inkSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.surface,
            border: Border.all(color: AppColors.border),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              const Icon(
                Icons.info_outline,
                size: 18,
                color: AppColors.inkMuted,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text.rich(
                  TextSpan(
                    style: AppText.textXsRegular.copyWith(
                      color: AppColors.inkSecondary,
                    ),
                    children: [
                      TextSpan(
                        text: 'Reason: ',
                        style: _inter.copyWith(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppColors.ink,
                        ),
                      ),
                      TextSpan(text: change.reason),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: AppColors.card,
            border: Border.all(color: AppColors.border),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              const Icon(
                Icons.cloud_queue,
                size: 16,
                color: AppColors.inkFaint,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Updated route not yet downloaded. Saved route still available offline.',
                  style: _inter.copyWith(
                    fontSize: 11,
                    height: 14 / 11,
                    color: AppColors.inkMuted,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Text(
          'STOP SEQUENCE CHANGES — TRIP 1',
          style: AppText.textXsSemibold.copyWith(color: AppColors.inkSecondary),
        ),
        const SizedBox(height: 8),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: _SequenceColumn(
                title: 'PREVIOUS ORDER',
                stops: change.previous,
                updated: false,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _SequenceColumn(
                title: 'NEW SEQUENCE',
                stops: change.updated,
                updated: true,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        _ImpactCard(change: change),
      ],
    );
  }
}

class _SequenceColumn extends StatelessWidget {
  const _SequenceColumn({
    required this.title,
    required this.stops,
    required this.updated,
  });

  final String title;
  final List<SequenceStop> stops;
  final bool updated;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: updated ? AppColors.surface : AppColors.card,
        border: Border.all(
          color: updated ? AppColors.yellow300 : AppColors.border,
        ),
        borderRadius: BorderRadius.circular(8),
        boxShadow: updated
            ? const [
                BoxShadow(
                  color: Color(0x0D000000),
                  offset: Offset(0, 2),
                  blurRadius: 2,
                ),
              ]
            : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Opacity(
            opacity: updated ? 1 : 0.7,
            child: Text(
              title,
              style: AppText.textXsSemibold.copyWith(
                color: updated ? AppColors.ink : AppColors.inkSecondary,
              ),
            ),
          ),
          for (var i = 0; i < stops.length; i++) ...[
            const SizedBox(height: 8),
            _StopRow(number: i + 1, stop: stops[i], updated: updated),
          ],
        ],
      ),
    );
  }
}

class _StopRow extends StatelessWidget {
  const _StopRow({
    required this.number,
    required this.stop,
    required this.updated,
  });

  final int number;
  final SequenceStop stop;
  final bool updated;

  @override
  Widget build(BuildContext context) {
    final label = '$number. ${stop.name}';
    if (stop.completed) {
      return Opacity(
        opacity: 0.5,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(
                  Icons.check_circle,
                  size: 12,
                  color: AppColors.lime700,
                ),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    label,
                    style: _inter.copyWith(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: AppColors.ink,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 2),
            Text(
              'Completed',
              style: _inter.copyWith(fontSize: 10, color: AppColors.inkMuted),
            ),
          ],
        ),
      );
    }

    final moved = stop.movement != StopMovement.none;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Flexible(
              child: Text(
                label,
                style: _inter.copyWith(
                  fontSize: 11,
                  fontWeight: updated ? FontWeight.w700 : FontWeight.w500,
                  color: AppColors.ink,
                ),
              ),
            ),
            if (updated && moved) _MovementTag(stop.movement),
          ],
        ),
        const SizedBox(height: 2),
        if (stop.area != null)
          Text(
            stop.area!,
            style: _inter.copyWith(fontSize: 10, color: AppColors.inkSecondary),
          ),
      ],
    );
  }
}

class _MovementTag extends StatelessWidget {
  const _MovementTag(this.movement);

  final StopMovement movement;

  @override
  Widget build(BuildContext context) {
    final up = movement == StopMovement.up;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
      decoration: BoxDecoration(
        color: up ? AppColors.yellow100 : AppColors.background,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        up ? 'UP ↑' : 'DOWN',
        style: _inter.copyWith(
          fontSize: 8,
          fontWeight: FontWeight.w700,
          color: up ? AppColors.yellow600 : AppColors.inkMuted,
        ),
      ),
    );
  }
}

class _ImpactCard extends StatelessWidget {
  const _ImpactCard({required this.change});

  final RouteChange change;

  @override
  Widget build(BuildContext context) {
    final base = AppText.textXsRegular.copyWith(color: AppColors.inkSecondary);
    final warning = change.tightWindow;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Estimated Impact', style: AppText.textSmSemibold),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(
                Icons.access_time,
                size: 16,
                color: AppColors.inkMuted,
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text.rich(
                  TextSpan(
                    style: base,
                    children: [
                      TextSpan(text: '${change.impactStopName} arrival now '),
                      TextSpan(
                        text: change.impactArrivalNow,
                        style: _inter.copyWith(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppColors.ink,
                        ),
                      ),
                      TextSpan(text: ' (was ${change.impactArrivalWas})'),
                    ],
                  ),
                ),
              ),
            ],
          ),
          if (warning != null) ...[
            const SizedBox(height: 6),
            Row(
              children: [
                const Icon(
                  Icons.warning,
                  size: 16,
                  color: AppColors.errorPrimary,
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    warning,
                    style: AppText.textXsSemibold.copyWith(
                      color: AppColors.errorPrimary,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _Actions extends StatelessWidget {
  const _Actions({
    required this.acknowledged,
    required this.busy,
    required this.onAcknowledge,
    required this.onViewTrip,
  });

  final bool acknowledged;
  final bool busy;
  final VoidCallback onAcknowledge;
  final VoidCallback onViewTrip;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          AppButton(
            label: acknowledged
                ? 'Route acknowledged'
                : 'Acknowledge updated route',
            padding: 14,
            radius: 8,
            backgroundColor: AppColors.brandYellow,
            isLoading: busy,
            onPressed: acknowledged ? null : onAcknowledge,
          ),
          const SizedBox(height: 12),
          InkWell(
            onTap: onViewTrip,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Text.rich(
                TextSpan(
                  style: AppText.textSmSemibold.copyWith(
                    color: AppColors.inkSecondary,
                  ),
                  children: [
                    const TextSpan(text: 'View full trip '),
                    TextSpan(
                      text: 'here →',
                      style: TextStyle(
                        color: AppColors.ink,
                        decoration: TextDecoration.underline,
                        fontVariations: const [FontVariation('wght', 600)],
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
