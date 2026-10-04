import 'package:flutter/material.dart';

import '../../../../core/format.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text.dart';
import '../../domain/trip.dart';
import 'loading_banner.dart';

/// One trip in the My Trips list (Figma "trip1-card").
///
/// Every trip shows a status illustration. The [highlighted] trip (the driver's
/// current one) gets the filled yellow button; other trips get an outlined one.
class TripCard extends StatelessWidget {
  const TripCard({
    super.key,
    required this.trip,
    required this.highlighted,
    required this.onViewTrip,
  });

  final Trip trip;
  final bool highlighted;
  final VoidCallback onViewTrip;

  @override
  Widget build(BuildContext context) {
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: AppColors.card,
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
            child: Column(
              children: [
                Text(trip.name, style: AppText.displayXs),
                const SizedBox(height: 2),
                Text(trip.subtitle,
                    style: AppText.textSmRegular
                        .copyWith(color: AppColors.inkSecondary)),
              ],
            ),
          ),
          const Divider(height: 1, thickness: 1, color: AppColors.divider),
          Padding(
            padding: const EdgeInsets.all(12),
            child: IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(
                    child: _Stat(
                      icon: Icons.notifications_none_rounded,
                      label: 'Departure',
                      value: formatTime(trip.departure),
                    ),
                  ),
                  const VerticalDivider(
                      width: 1, thickness: 1, color: AppColors.divider),
                  Padding(
                    padding: const EdgeInsets.only(left: 12),
                    child: _Stat(
                      icon: Icons.map_rounded,
                      label: 'Stops',
                      value: '${trip.stops.length}',
                    ),
                  ),
                ],
              ),
            ),
          ),
          _Illustration(status: trip.status),
          if (trip.status == TripStatus.loading) const LoadingBanner(),
          Padding(
            padding: const EdgeInsets.all(12),
            child: highlighted
                ? _FilledButton(label: 'View trip', onTap: onViewTrip)
                : _OutlinedButton(label: 'View Trip', onTap: onViewTrip),
          ),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.icon, required this.label, required this.value});

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 24, color: AppColors.ink),
            const SizedBox(width: 8),
            Text(label, style: AppText.textXsRegular),
          ],
        ),
        const SizedBox(height: 6),
        Text(value, style: AppText.textLgSemibold),
      ],
    );
  }
}

/// Illustration per trip status. Every status uses the worker image for now;
/// swap an entry here when the real artwork for that status arrives.
const _statusImages = <TripStatus, String>{
  TripStatus.assigned: 'assets/images/worker.png',
  TripStatus.loading: 'assets/images/worker.png',
  TripStatus.ready: 'assets/images/worker.png',
  TripStatus.inProgress: 'assets/images/worker.png',
  TripStatus.completed: 'assets/images/worker.png',
};

class _Illustration extends StatelessWidget {
  const _Illustration({required this.status});

  final TripStatus status;

  // Crop of the source image; fractions come from Figma.
  static const _w = 144.0, _h = 118.0;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      key: const Key('trip-illustration'),
      width: _w,
      height: _h,
      child: ClipRect(
        child: Stack(
          children: [
            Positioned(
              left: -0.115 * _w,
              top: -0.0004 * _h,
              width: 1.23 * _w,
              height: 1.0008 * _h,
              child: Image.asset(_statusImages[status]!, fit: BoxFit.fill),
            ),
          ],
        ),
      ),
    );
  }
}

class _FilledButton extends StatelessWidget {
  const _FilledButton({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.primary,
      borderRadius: BorderRadius.circular(4),
      child: InkWell(
        borderRadius: BorderRadius.circular(4),
        onTap: onTap,
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          alignment: Alignment.center,
          child: Text(label, style: AppText.textSmSemibold),
        ),
      ),
    );
  }
}

class _OutlinedButton extends StatelessWidget {
  const _OutlinedButton({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(4),
        side: const BorderSide(color: AppColors.border),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(4),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(label, style: AppText.textSmSemibold),
              const SizedBox(width: 8),
              const Icon(Icons.arrow_forward_rounded,
                  size: 18, color: AppColors.ink),
            ],
          ),
        ),
      ),
    );
  }
}
