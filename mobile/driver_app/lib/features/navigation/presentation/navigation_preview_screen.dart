import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';

import '../../../core/format.dart';
import '../../../core/router/routes.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/back_bar.dart';
import '../../../core/widgets/camera_target.dart';
import '../../../core/widgets/map_mode.dart';
import '../../../core/widgets/map_view.dart';
import '../../../core/widgets/vehicle_box.dart';
import '../../trips/application/trip_actions.dart';
import '../../trips/data/trips_providers.dart';
import '../../trips/domain/stop.dart';
import '../application/navigation_controller.dart';
import '../application/route_providers.dart';
import 'widgets/route_marker.dart';
import 'widgets/vehicle_marker.dart';

/// Where the driver starts, until real location services exist (Peliyagoda depot).
const _depot = LatLng(6.9645, 79.8880);

const _bearing = Distance();

/// The vehicle's start: the last stop already delivered before [active],
/// otherwise the depot.
LatLng _originFor(List<Stop> stops, Stop active) {
  Stop? previous;
  for (final s in stops) {
    if (s.sequence < active.sequence && s.status == StopStatus.completed) {
      previous = s;
    }
  }
  return previous == null ? _depot : LatLng(previous.lat, previous.lng);
}

/// Route preview and simulated navigation to the active stop
/// (Figma "6 — Navigation Preview").
class NavigationPreviewScreen extends ConsumerStatefulWidget {
  const NavigationPreviewScreen({
    super.key,
    required this.tripId,
    required this.stopId,
  });

  final String tripId;
  final String stopId;

  @override
  ConsumerState<NavigationPreviewScreen> createState() =>
      _NavigationPreviewScreenState();
}

class _NavigationPreviewScreenState
    extends ConsumerState<NavigationPreviewScreen> {
  /// Camera follows the vehicle while navigating; a manual pan turns it off.
  bool _following = true;

  /// Origin and destination are shown (and routed) the other way round.
  bool _swapped = false;

  /// One-off recentre from the locate button while not navigating.
  CameraTarget? _locate;

  bool _busy = false;

  StopRef get _ref => (tripId: widget.tripId, stopId: widget.stopId);

  CameraTarget _targetFor(LatLng point, double heading, MapMode mode) =>
      mode == MapMode.tilted
      ? CameraTarget(point: point, bearing: heading, zoom: 18, pitch: 60)
      : CameraTarget(point: point, zoom: 17.5);

  Future<void> _arrived() async {
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
    final nav = ref.watch(navigationProvider);
    final mode = ref.watch(mapModeProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          BackBar(
            onBack: () => context.canPop()
                ? context.pop()
                : context.go(AppRoutes.stop(widget.tripId, widget.stopId)),
          ),
          Expanded(
            child: AsyncValueView(
              value: data,
              onRetry: () => ref.invalidate(tripStopProvider(_ref)),
              data: (d) {
                final stops = d.trip.stops;
                final points = [
                  _depot,
                  for (final s in stops) LatLng(s.lat, s.lng),
                ];
                final dest = LatLng(d.stop.lat, d.stop.lng);
                final origin = _originFor(stops, d.stop);
                final leg = _swapped ? [dest, origin] : [origin, dest];
                final legRoute =
                    ref.watch(roadRouteProvider(RouteRequest(leg))).value ??
                    leg;

                final pos = nav.position;
                final navigating = nav.phase == NavPhase.navigating;
                final vehicle = pos?.point ?? leg.first;
                final heading =
                    pos?.heading ??
                    (_bearing.bearing(leg.first, leg.last) + 360) % 360;

                // Keep following through arrival so the camera stays on the van; a stale
                // locate target must not pull it back afterwards.
                final CameraTarget? target =
                    nav.phase != NavPhase.idle && _following && pos != null
                    ? _targetFor(vehicle, heading, mode)
                    : _locate;

                return Stack(
                  children: [
                    Positioned.fill(
                      child: MapView(
                        center: dest,
                        fit: points,
                        mode: mode,
                        cameraTarget: target,
                        vehicle3d: mode == MapMode.tilted
                            ? Vehicle3D(point: vehicle, heading: heading)
                            : null,
                        onUserMoved: () {
                          if (_following || _locate != null) {
                            setState(() {
                              _following = false;
                              _locate = null;
                            });
                          }
                        },
                        // Keep every stop clear of the callout and the sheet.
                        fitPadding: const EdgeInsets.fromLTRB(40, 170, 40, 260),
                        route:
                            ref
                                .watch(roadRouteProvider(RouteRequest(points)))
                                .value ??
                            points,
                        markers: [
                          for (final s in stops)
                            MapMarker(
                              point: LatLng(s.lat, s.lng),
                              width: 32,
                              height: 32,
                              child: RouteMarker(
                                number: s.sequence,
                                completed: s.status == StopStatus.completed,
                              ),
                            ),
                          // Tilted view draws the van as a real 3D box instead.
                          if (mode == MapMode.flat)
                            MapMarker(
                              point: vehicle,
                              width: 44,
                              height: 44,
                              flat: mode == MapMode.tilted,
                              child: VehicleMarker(heading: heading),
                            ),
                        ],
                      ),
                    ),
                    Positioned(
                      left: 20,
                      right: 20,
                      top: 27,
                      child: _RouteCallout(
                        destination: d.stop.name,
                        swapped: _swapped,
                        live: navigating,
                        toGo: navigating && pos != null
                            ? '${(pos.remainingMeters / 1000).toStringAsFixed(1)} km to go'
                            : null,
                        onSwap: navigating
                            ? null
                            : () => setState(() => _swapped = !_swapped),
                      ),
                    ),
                    Positioned(
                      right: 20,
                      top: 150,
                      child: _RoundButton(
                        key: const Key('map-mode-toggle'),
                        onTap: () =>
                            ref.read(mapModeProvider.notifier).toggle(),
                        child: Text(
                          mode == MapMode.flat ? '3D' : '2D',
                          style: AppText.textSmMedium,
                        ),
                      ),
                    ),
                    Positioned(
                      right: 20,
                      top: 210,
                      child: _RoundButton(
                        key: const Key('locate-button'),
                        onTap: () => setState(() {
                          _following = true;
                          _locate = _targetFor(vehicle, heading, mode);
                        }),
                        child: const Icon(
                          Icons.my_location,
                          size: 22,
                          color: AppColors.ink,
                        ),
                      ),
                    ),
                    Align(
                      alignment: Alignment.bottomCenter,
                      child: _SummarySheet(
                        stop: d.stop,
                        nav: nav,
                        busy: _busy,
                        onToggle: () {
                          if (navigating) {
                            setState(() => _locate = null);
                            ref.read(navigationProvider.notifier).end();
                          } else {
                            setState(() {
                              _following = true;
                              _locate = null;
                            });
                            ref
                                .read(navigationProvider.notifier)
                                .start(legRoute);
                          }
                        },
                        onArrived: _arrived,
                        // Full route details live on the trip overview.
                        onDetails: () =>
                            context.go(AppRoutes.trip(widget.tripId)),
                      ),
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

class _RoundButton extends StatelessWidget {
  const _RoundButton({super.key, required this.onTap, required this.child});

  final VoidCallback onTap;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.card,
      shape: const CircleBorder(side: BorderSide(color: AppColors.border)),
      elevation: 3,
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: SizedBox(width: 48, height: 48, child: Center(child: child)),
      ),
    );
  }
}

class _RouteCallout extends StatelessWidget {
  const _RouteCallout({
    required this.destination,
    required this.swapped,
    required this.live,
    required this.toGo,
    required this.onSwap,
  });

  final String destination;

  /// Show the stop first and "Your Location" second.
  final bool swapped;

  /// Navigating: shows the live dot next to "Your Location".
  final bool live;
  final String? toGo;

  /// Null while navigating (the direction can't change mid-drive).
  final VoidCallback? onSwap;

  @override
  Widget build(BuildContext context) {
    final you = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text('Your Location', style: AppText.textSmMedium),
        if (live) ...[
          const SizedBox(width: 8),
          Container(
            key: const Key('live-dot'),
            width: 8,
            height: 8,
            decoration: const BoxDecoration(
              color: AppColors.lime800,
              shape: BoxShape.circle,
            ),
          ),
        ],
      ],
    );
    final stop = Text(
      destination,
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: AppText.textSmRegular,
    );

    return Container(
      decoration: BoxDecoration(
        color: AppColors.card,
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(12),
        boxShadow: const [
          BoxShadow(
            color: Color(0x2B000000),
            offset: Offset(0, 5),
            blurRadius: 12,
          ),
        ],
      ),
      child: Column(
        children: [
          SizedBox(
            height: 53,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Row(
                children: [
                  SvgPicture.asset(
                    'assets/images/circle.svg',
                    width: 14,
                    height: 14,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: swapped ? stop : you,
                    ),
                  ),
                  if (toGo != null)
                    Text(
                      toGo!,
                      style: AppText.textSmRegular.copyWith(
                        color: AppColors.inkSecondary,
                      ),
                    )
                  else
                    SvgPicture.asset(
                      'assets/images/ellipsis.svg',
                      width: 20,
                      height: 20,
                    ),
                ],
              ),
            ),
          ),
          const Divider(height: 1, thickness: 1, color: AppColors.border),
          SizedBox(
            height: 54,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Row(
                children: [
                  SvgPicture.asset(
                    'assets/images/map_pin.svg',
                    width: 15,
                    height: 15,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: swapped ? you : stop,
                    ),
                  ),
                  InkWell(
                    key: const Key('swap-button'),
                    onTap: onSwap,
                    child: Opacity(
                      opacity: onSwap == null ? 0.35 : 1,
                      child: SvgPicture.asset(
                        'assets/images/arrow_up_down.svg',
                        width: 20,
                        height: 20,
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

class _SummarySheet extends StatelessWidget {
  const _SummarySheet({
    required this.stop,
    required this.nav,
    required this.busy,
    required this.onToggle,
    required this.onArrived,
    required this.onDetails,
  });

  final Stop stop;
  final NavState nav;
  final bool busy;
  final VoidCallback onToggle;
  final VoidCallback onArrived;
  final VoidCallback onDetails;

  @override
  Widget build(BuildContext context) {
    final arrived = nav.phase == NavPhase.arrived;
    final navigating = nav.phase == NavPhase.navigating && nav.position != null;
    final minutes = navigating
        ? math.max(1, (stop.etaMinutes * (1 - nav.progress)).ceil())
        : stop.etaMinutes;
    final km = navigating
        ? nav.position!.remainingMeters / 1000
        : stop.distanceKm;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 20),
      decoration: const BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            arrived ? 'You have arrived' : '$minutes min',
            style: AppText.displaySmMedium,
          ),
          const SizedBox(height: 2),
          Text(
            arrived
                ? stop.name
                : '${km.toStringAsFixed(1)} km · Estimated arrival ${formatHm(stop.plannedArrival)}',
            style: AppText.textSmRegular.copyWith(
              color: AppColors.inkSecondary,
            ),
          ),
          const SizedBox(height: 24),
          if (arrived)
            AppButton(label: "I've arrived", onPressed: busy ? null : onArrived)
          else ...[
            AppButton(
              key: const Key('nav-toggle'),
              label: navigating ? 'End navigation' : 'Start navigation',
              variant: AppButtonVariant.outlined,
              leadingIcon: Icons.send_rounded,
              onPressed: onToggle,
            ),
            const SizedBox(height: 6),
            AppButton(label: 'Route details', onPressed: onDetails),
          ],
        ],
      ),
    );
  }
}
