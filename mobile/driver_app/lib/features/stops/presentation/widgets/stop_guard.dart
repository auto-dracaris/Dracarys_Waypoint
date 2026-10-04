import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/routes.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text.dart';
import '../../../../core/widgets/app_button.dart';
import '../../../../core/widgets/back_bar.dart';
import '../../../route_update/data/route_changes_providers.dart';
import '../../../trips/data/trips_providers.dart';
import '../../../trips/domain/stop.dart';
import '../../../trips/domain/stop_gate.dart';

/// Where in a stop's flow a screen sits: directions come before arriving;
/// the delivery details, proof and issue report come after.
enum StopStep { beforeArrival, afterArrival }

/// Wraps a stop-action screen (directions, arrived, proof, issue) so it can't
/// be reached by a deep link or stale route while the stop isn't actionable,
/// e.g. the trip is still loading or an earlier stop comes first.
class StopGuard extends ConsumerWidget {
  const StopGuard({
    super.key,
    required this.tripId,
    required this.stopId,
    required this.child,
    this.step,
  });

  final String tripId;
  final String stopId;
  final Widget child;

  /// When set, the stop must also be at this point of its flow.
  final StopStep? step;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final data = ref.watch(tripStopProvider((tripId: tripId, stopId: stopId)));
    final d = data.value;
    if (d == null) {
      // Errors fall through to the screen's own error handling.
      return data.hasError
          ? child
          : const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    final gate = stopGate(d.trip, d.stop);
    var title = gate.title, message = gate.message;
    var back = AppRoutes.trip(tripId);
    var backLabel = 'Back to trip';
    if (gate.canAct && ref.watch(routeUpdatePendingProvider(tripId))) {
      title = 'Route updated';
      message =
          'The dispatcher changed this trip. Review the new route '
          'before continuing.';
      back = AppRoutes.routeUpdate(tripId);
      backLabel = 'Review route update';
    } else if (gate.canAct) {
      final status = d.stop.status;
      if (step == StopStep.beforeArrival && status != StopStatus.pending) {
        title = 'Already arrived';
        message = 'You have already arrived at this stop.';
      } else if (step == StopStep.afterArrival &&
          status != StopStatus.arrived) {
        title = 'Mark arrived first';
        message = 'Arrive at this stop before recording its delivery.';
      } else {
        return child;
      }
      back = AppRoutes.stop(tripId, stopId);
      backLabel = 'Back to stop';
    }
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          BackBar(onBack: () => context.go(AppRoutes.trips)),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    title,
                    textAlign: TextAlign.center,
                    style: AppText.displayXs,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    message,
                    textAlign: TextAlign.center,
                    style: AppText.textSmRegular.copyWith(
                      color: AppColors.inkSecondary,
                    ),
                  ),
                  const SizedBox(height: 24),
                  AppButton(
                    label: backLabel,
                    onPressed: () => context.go(back),
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
