import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/error_message.dart';
import '../../../core/clock.dart';
import '../../../core/connectivity/online_provider.dart';
import '../../../core/crypto/delivery_code.dart';
import '../../../core/format.dart';
import '../../../core/photos/photo_picker.dart';
import '../../../core/photos/signature_png.dart';
import '../../../core/router/routes.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/labeled_field.dart';
import '../../../core/widgets/photo_tiles.dart';
import '../../../core/widgets/signature_pad.dart';
import '../../../core/widgets/toggle_tabs.dart';
import '../../../core/uuid.dart';
import '../../../core/widgets/trip_header_bar.dart';
import '../../trips/application/trip_actions.dart';
import '../../trips/data/trips_providers.dart';
import '../../trips/domain/order.dart';
import '../../trips/domain/stop.dart';
import '../../trips/presentation/widgets/temperature_chip.dart';
import '../data/stop_reports_repository.dart';
import 'delivered_quantities.dart';

String _cases(int n) => '$n ${n == 1 ? 'case' : 'cases'}';

/// Proof of delivery (Figma "driver-proof-of-delivery"): summary of what was
/// handed over, who received it, and a signature or photo.
class ProofOfDeliveryScreen extends ConsumerStatefulWidget {
  const ProofOfDeliveryScreen({
    super.key,
    required this.tripId,
    required this.stopId,
  });

  final String tripId;
  final String stopId;

  @override
  ConsumerState<ProofOfDeliveryScreen> createState() =>
      _ProofOfDeliveryScreenState();
}

class _ProofOfDeliveryScreenState extends ConsumerState<ProofOfDeliveryScreen> {
  static const _signature = 0;

  final _name = TextEditingController();
  final _notes = TextEditingController();
  int _mode = _signature;
  Strokes _strokes = const [];
  PickedPhoto? _photo;
  final _code = TextEditingController();

  /// Minted once so that retrying a half-finished submission reuses the same
  /// ids and nothing is stored twice.
  final _ids = ProofIds(
    proof: newUuid(),
    signature: newUuid(),
    photo: newUuid(),
  );
  bool _submitted = false;
  bool _busy = false;

  /// The code typed was checked on this phone and does not match.
  bool _codeWrong = false;

  StopRef get _ref => (tripId: widget.tripId, stopId: widget.stopId);

  @override
  void dispose() {
    _name.dispose();
    _notes.dispose();
    _code.dispose();
    super.dispose();
  }

  bool get _hasProof =>
      _mode == _signature ? SignaturePad.isSigned(_strokes) : _photo != null;

  String? get _nameError => _submitted && _name.text.trim().isEmpty
      ? "Enter the staff member's name"
      : null;

  String? get _proofError =>
      _submitted && !_hasProof ? 'Capture a signature or photo' : null;

  Future<void> _takePhoto() async {
    try {
      final photo = await ref
          .read(photoPickerProvider)
          .pick(PhotoSource.camera);
      if (photo != null && mounted) setState(() => _photo = photo);
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    }
  }

  /// The code is optional (a store that cannot give one is covered by the
  /// proof), but when typed it must be the six digits the outlet was texted.
  String? get _codeError {
    if (_codeWrong)
      return 'That code does not match the one sent to the outlet';
    final code = _code.text.trim();
    return _submitted && code.isNotEmpty && !RegExp(r'^\d{6}$').hasMatch(code)
        ? 'The delivery code is 6 digits'
        : null;
  }

  Future<void> _complete(TripStop d) async {
    setState(() => _submitted = true);
    if (_name.text.trim().isEmpty || !_hasProof || _codeError != null) return;
    final short = unreportedShortOrders(
      [for (final o in d.stop.orders) (id: o.id, cases: o.cases)],
      ref.read(deliveredQuantitiesProvider),
      ref.read(reportedOrdersProvider),
    );
    if (short.isNotEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Report an issue for the short delivery first'),
        ),
      );
      return;
    }
    if (d.stop.status != StopStatus.arrived) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Mark this stop as arrived first')),
      );
      return;
    }

    // With no signal the server cannot check the outlet's code, but the phone
    // was given its hash when the trip started: check it here, so a wrong code
    // is caught while the driver is still standing at the dock.
    final code = _code.text.trim();
    final hash = d.stop.deliveryCode;
    if (code.isNotEmpty &&
        hash != null &&
        !ref.read(onlineProvider) &&
        ref.read(tripsRepositoryProvider).usesCodes) {
      setState(() => _busy = true);
      final ok = await ref.read(deliveryCodeVerifierProvider)(code, hash);
      if (!mounted) return;
      if (!ok) {
        setState(() {
          _busy = false;
          _codeWrong = true;
        });
        return;
      }
    }
    setState(() => _busy = true);
    try {
      final actions = ref.read(tripActionsProvider);
      final entered = ref.read(deliveredQuantitiesProvider);
      final bySignature = _mode == _signature;
      // Proof first: it is what lets a stop complete without the outlet's code.
      await actions.submitProof(
        widget.tripId,
        widget.stopId,
        ids: _ids,
        receivedBy: _name.text.trim(),
        notes: _notes.text,
        signaturePng: bySignature
            ? await ref.read(signatureEncoderProvider)(_strokes)
            : null,
        photo: bySignature ? null : _photo,
      );
      await actions.completeStop(
        widget.tripId,
        widget.stopId,
        deliveredCases: {
          for (final o in d.stop.orders) o.id: entered[o.id] ?? o.cases,
        },
        deliveryCode: _code.text.trim(),
      );
      ref.read(deliveredQuantitiesProvider.notifier).clear();
      ref.read(reportedOrdersProvider.notifier).clear();

      final trip = await ref.read(tripProvider(widget.tripId).future);
      final next = trip.activeStop;
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            '${next == null ? 'Trip completed' : 'Stop completed'}'
            '${ref.read(onlineProvider) ? '' : ' · saved on this phone, will sync'}',
          ),
        ),
      );
      context.go(
        next == null ? AppRoutes.trips : AppRoutes.stop(widget.tripId, next.id),
      );
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
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
            plate: plate,
            onBack: () => context.go(AppRoutes.trips),
          ),
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
                      style: AppText.textXsSemibold.copyWith(
                        color: AppColors.inkSecondary,
                      ),
                    ),
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
                    if (ref.watch(tripsRepositoryProvider).usesCodes) ...[
                      LabeledField(
                        label: 'Delivery code (optional)',
                        hint: '6 digits from the store manager',
                        fieldKey: const Key('delivery-code'),
                        controller: _code,
                        keyboardType: TextInputType.number,
                        errorText: _codeError,
                        onChanged: (_) => setState(() => _codeWrong = false),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'The outlet was texted this code. If the store cannot '
                        'give it, leave it empty: the signature or photo above '
                        'completes the stop and the dispatcher is told.',
                        style: AppText.textXsRegular.copyWith(
                          color: AppColors.inkMuted,
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],
                    Text(
                      'This record will be shared with the dispatcher and store manager. '
                      'If offline: saved on this device — waiting to sync.',
                      style: AppText.textXsRegular.copyWith(
                        color: AppColors.inkMuted,
                      ),
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
          Text(
            'Proof of delivery',
            style: AppText.textXsSemibold.copyWith(
              color: AppColors.inkSecondary,
            ),
          ),
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
              child: _photo != null
                  ? PhotoThumb(
                      bytes: _photo!.bytes,
                      onRemove: () => setState(() => _photo = null),
                    )
                  : AddPhotoTile(onTap: _takePhoto),
            ),
          if (proofError != null)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                proofError,
                style: AppText.textXsRegular.copyWith(color: AppColors.red700),
              ),
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
                TemperatureChip(
                  o.temperature,
                  style: TemperatureChipStyle.summary,
                ),
                const Spacer(),
                Text(
                  '${_cases(qty(o))} delivered',
                  style: AppText.textSmRegular.copyWith(
                    color: AppColors.inkSecondary,
                  ),
                ),
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
            value: arrivedAt == null ? '—' : formatTime(arrivedAt!),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _TimeTile(label: 'Completing', value: formatTime(now)),
        ),
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
          Text(
            label,
            style: AppText.textXsRegular.copyWith(
              color: AppColors.inkSecondary,
            ),
          ),
          const SizedBox(height: 4),
          Text(value, style: AppText.textSmSemibold),
        ],
      ),
    );
  }
}
