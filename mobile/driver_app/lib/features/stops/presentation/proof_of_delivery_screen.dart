import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/clock.dart';
import '../../../core/format.dart';
import '../../../core/router/routes.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/labeled_field.dart';
import '../../../core/widgets/photo_tiles.dart';
import '../../../core/widgets/signature_pad.dart';
import '../../../core/widgets/toggle_tabs.dart';
import '../../../core/widgets/trip_header_bar.dart';
import '../../trips/application/trip_actions.dart';
import '../../trips/data/trips_providers.dart';
import '../../trips/domain/order.dart';
import '../../trips/domain/stop.dart';
import '../../trips/presentation/widgets/temperature_chip.dart';
import 'delivered_quantities.dart';

String _cases(int n) => '$n ${n == 1 ? 'case' : 'cases'}';

/// Proof of delivery (Figma "driver-proof-of-delivery"): summary of what was
/// handed over, who received it, and a signature or photo.
class ProofOfDeliveryScreen extends ConsumerStatefulWidget {
  const ProofOfDeliveryScreen(
      {super.key, required this.tripId, required this.stopId});

  final String tripId;
  final String stopId;

  @override
  ConsumerState<ProofOfDeliveryScreen> createState() =>
      _ProofOfDeliveryScreenState();
}

class _ProofOfDeliveryScreenState
    extends ConsumerState<ProofOfDeliveryScreen> {
  static const _signature = 0;

  final _name = TextEditingController();
  final _notes = TextEditingController();
  int _mode = _signature;
  Strokes _strokes = const [];
  bool _hasPhoto = false;
  bool _submitted = false;
  bool _busy = false;

  StopRef get _ref => (tripId: widget.tripId, stopId: widget.stopId);

  @override
  void dispose() {
    _name.dispose();
    _notes.dispose();
    super.dispose();
  }

  bool get _hasProof =>
      _mode == _signature ? SignaturePad.isSigned(_strokes) : _hasPhoto;

  String? get _nameError => _submitted && _name.text.trim().isEmpty
      ? "Enter the staff member's name"
      : null;

  String? get _proofError =>
      _submitted && !_hasProof ? 'Capture a signature or photo' : null;

  Future<void> _complete(TripStop d) async {
    setState(() => _submitted = true);
    if (_name.text.trim().isEmpty || !_hasProof) return;
    if (d.stop.status != StopStatus.arrived) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Mark this stop as arrived first')));
      return;
    }

    setState(() => _busy = true);
    try {
      final entered = ref.read(deliveredQuantitiesProvider);
      await ref.read(tripActionsProvider).completeStop(
            widget.tripId,
            widget.stopId,
            deliveredCases: {
              for (final o in d.stop.orders) o.id: entered[o.id] ?? o.cases,
            },
          );
      ref.read(deliveredQuantitiesProvider.notifier).clear();

      final trip = await ref.read(tripProvider(widget.tripId).future);
      final next = trip.activeStop;
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(next == null ? 'Trip completed' : 'Stop completed')));
      context.go(
          next == null ? AppRoutes.trips : AppRoutes.stop(widget.tripId, next.id));
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
          TripHeaderBar(
              plate: plate, onBack: () => context.go(AppRoutes.trips)),
          const Divider(height: 1, thickness: 1, color: AppColors.border),
          Expanded(
            child: AsyncValueView(
              value: data,
              onRetry: () => ref.invalidate(tripStopProvider(_ref)),
              data: (d) => SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                        'STOP ${d.stop.sequence} OF ${d.trip.stops.length}',
                        style: AppText.textXsSemibold
                            .copyWith(color: AppColors.inkSecondary)),
                    const SizedBox(height: 4),
                    Text(d.stop.name, style: AppText.displayXs),
                    const SizedBox(height: 16),
                    _SummaryCard(orders: d.stop.orders),
                    const SizedBox(height: 16),
                    _Timestamps(arrivedAt: d.stop.arrivedAt),
                    const SizedBox(height: 16),
                    _receivedByCard(),
                    const SizedBox(height: 16),
                    LabeledField(
                      label: 'Notes (optional)',
                      hint: 'Add a note for the dispatcher…',
                      controller: _notes,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'This record will be shared with the dispatcher and store manager. '
                      'If offline: saved on this device — waiting to sync.',
                      style: AppText.textXsRegular
                          .copyWith(color: AppColors.inkMuted),
                    ),
                    const SizedBox(height: 16),
                    AppButton(
                      label: 'Complete stop',
                      bold: true,
                      padding: 14,
                      radius: 8,
                      backgroundColor: AppColors.brandYellow,
                      trailingIcon: Icons.arrow_forward_rounded,
                      isLoading: _busy,
                      onPressed: () => _complete(d),
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

  Widget _receivedByCard() {
    final proofError = _proofError;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Received by', style: AppText.textSmBold),
          const SizedBox(height: 16),
          LabeledField(
            label: 'Staff member name',
            fieldKey: const Key('staff-name'),
            controller: _name,
            errorText: _nameError,
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 16),
          Text('Proof of delivery',
              style: AppText.textXsSemibold
                  .copyWith(color: AppColors.inkSecondary)),
          const SizedBox(height: 10),
          ToggleTabs(
            labels: const ['Signature', 'Photo'],
            selectedIndex: _mode,
            onChanged: (i) => setState(() => _mode = i),
          ),
          const SizedBox(height: 10),
          if (_mode == _signature)
            SignaturePad(
              strokes: _strokes,
              onChanged: (s) => setState(() => _strokes = s),
            )
          else
            Align(
              alignment: Alignment.centerLeft,
              child: _hasPhoto
                  ? PhotoThumb(
                      asset: 'assets/images/issue_photo.jpg',
                      onRemove: () => setState(() => _hasPhoto = false),
                    )
                  : AddPhotoTile(
                      // A real camera picker replaces this sample photo.
                      onTap: () => setState(() => _hasPhoto = true),
                    ),
            ),
          if (proofError != null)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(proofError,
                  style:
                      AppText.textXsRegular.copyWith(color: AppColors.red700)),
            ),
        ],
      ),
    );
  }
}

class _SummaryCard extends ConsumerWidget {
  const _SummaryCard({required this.orders});

  final List<Order> orders;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final entered = ref.watch(deliveredQuantitiesProvider);
    int qty(Order o) => entered[o.id] ?? o.cases;
    final total = orders.fold<int>(0, (sum, o) => sum + qty(o));

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Delivery summary', style: AppText.textSmBold),
          const SizedBox(height: 12),
          for (final o in orders) ...[
            Row(
              children: [
                Text(o.id, style: AppText.textSmBold),
                const SizedBox(width: 8),
                TemperatureChip(o.temperature,
                    style: TemperatureChipStyle.summary),
                const Spacer(),
                Text('${_cases(qty(o))} delivered',
                    style: AppText.textSmRegular
                        .copyWith(color: AppColors.inkSecondary)),
              ],
            ),
            const SizedBox(height: 12),
          ],
          const Divider(height: 1, thickness: 1, color: AppColors.border),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Total', style: AppText.textSmBold),
              Text('${_cases(total)} total', style: AppText.textSmBold),
            ],
          ),
        ],
      ),
    );
  }
}

class _Timestamps extends ConsumerWidget {
  const _Timestamps({required this.arrivedAt});

  final DateTime? arrivedAt;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final now = ref.watch(clockProvider)();
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: _TimeTile(
              label: 'Arrived',
              value: arrivedAt == null ? '—' : formatTime(arrivedAt!)),
        ),
        const SizedBox(width: 12),
        Expanded(child: _TimeTile(label: 'Completing', value: formatTime(now))),
      ],
    );
  }
}

class _TimeTile extends StatelessWidget {
  const _TimeTile({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
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
          Text(label,
              style: AppText.textXsRegular
                  .copyWith(color: AppColors.inkSecondary)),
          const SizedBox(height: 4),
          Text(value, style: AppText.textSmSemibold),
        ],
      ),
    );
  }
}
