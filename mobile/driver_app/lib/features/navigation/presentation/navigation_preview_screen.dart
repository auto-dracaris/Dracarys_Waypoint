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
import '../../../core/widgets/map_view.dart';
import '../../trips/data/trips_providers.dart';
import '../../trips/domain/stop.dart';
import 'widgets/route_marker.dart';

/// Where the driver is, until real location services exist (Peliyagoda depot).
const _depot = LatLng(6.9645, 79.8880);

/// Route preview to the active stop (Figma "6 — Navigation Preview").
class NavigationPreviewScreen extends ConsumerWidget {
  const NavigationPreviewScreen(
      {super.key, required this.tripId, required this.stopId});

  final String tripId;
  final String stopId;

  StopRef get _ref => (tripId: tripId, stopId: stopId);

  void _unavailable(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Turn-by-turn navigation is not part of this demo yet')));
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final data = ref.watch(tripStopProvider(_ref));

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          BackBar(
            onBack: () => context.canPop()
                ? context.pop()
                : context.go(AppRoutes.stop(tripId, stopId)),
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
                return Stack(
                  children: [
                    Positioned.fill(
                      child: MapView(
                        center: LatLng(d.stop.lat, d.stop.lng),
                        fit: points,
                        // Keep every stop clear of the callout and the sheet.
                        fitPadding:
                            const EdgeInsets.fromLTRB(40, 170, 40, 260),
                        route: points,
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
                        ],
                      ),
                    ),
                    Positioned(
                      left: 20,
                      right: 20,
                      top: 27,
                      child: _RouteCallout(destination: d.stop.name),
                    ),
                    Align(
                      alignment: Alignment.bottomCenter,
                      child: _SummarySheet(
                        stop: d.stop,
                        onStart: () => _unavailable(context),
                        // Full route details live on the trip overview.
                        onDetails: () => context.go(AppRoutes.trip(tripId)),
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

class _RouteCallout extends StatelessWidget {
  const _RouteCallout({required this.destination});

  final String destination;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.card,
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(12),
        boxShadow: const [
          BoxShadow(
              color: Color(0x2B000000), offset: Offset(0, 5), blurRadius: 12),
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
                  SvgPicture.asset('assets/images/circle.svg',
                      width: 14, height: 14),
                  const SizedBox(width: 8),
                  Expanded(
                      child:
                          Text('Your Location', style: AppText.textSmMedium)),
                  SvgPicture.asset('assets/images/ellipsis.svg',
                      width: 20, height: 20),
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
                  SvgPicture.asset('assets/images/map_pin.svg',
                      width: 15, height: 15),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(destination,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppText.textSmRegular),
                  ),
                  SvgPicture.asset('assets/images/arrow_up_down.svg',
                      width: 20, height: 20),
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
    required this.onStart,
    required this.onDetails,
  });

  final Stop stop;
  final VoidCallback onStart;
  final VoidCallback onDetails;

  @override
  Widget build(BuildContext context) {
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
          Text('${stop.etaMinutes} min', style: AppText.displaySmMedium),
          const SizedBox(height: 2),
          Text(
            '${stop.distanceKm.toStringAsFixed(1)} km · Estimated arrival ${formatHm(stop.plannedArrival)}',
            style:
                AppText.textSmRegular.copyWith(color: AppColors.inkSecondary),
          ),
          const SizedBox(height: 24),
          AppButton(
            label: 'Start navigation',
            variant: AppButtonVariant.outlined,
            leadingIcon: Icons.send_rounded,
            onPressed: onStart,
          ),
          const SizedBox(height: 6),
          AppButton(label: 'Route details', onPressed: onDetails),
        ],
      ),
    );
  }
}
