import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/error_message.dart';
import '../../../core/clock.dart';
import '../../../core/connectivity/online_provider.dart';
import '../../../core/crypto/delivery_code.dart';
import '../../../core/format.dart';
import '../../../core/photos/photo_picker.dart';
import '../../../core/router/routes.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/labeled_field.dart';
import '../../../core/widgets/photo_tiles.dart';
import '../../../core/widgets/otp_boxes.dart';
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
/// handed over, who received it, and the outlet's OTP or a photo.
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
  static const _otp = 0;

  final _name = TextEditingController();
  final _notes = TextEditingController();
  int _mode = _otp;
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

  /// The code typed matched (or, with nothing to check it against, has the
  /// right shape; the server judges it when the stop completes).
  bool _otpVerified = false;
  String? _otpError;

  StopRef get _ref => (tripId: widget.tripId, stopId: widget.stopId);

  @override
  void dispose() {
    _name.dispose();
    _notes.dispose();
    _code.dispose();
    super.dispose();
  }

  bool get _hasProof => _mode == _otp ? _otpVerified : _photo != null;

  String? get _nameError => _submitted && _name.text.trim().isEmpty
      ? "Enter the staff member's name"
      : null;

  String? get _proofError => _submitted && !_hasProof
      ? (_mode == _otp
            ? 'Enter and verify the code from the store'
            : 'Capture a photo')
      : null;

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

  /// Checks the typed code. The phone holds the outlet code's hash from the
  /// moment the trip started, so it can say right away (online or not) whether
  /// the code is the one the store was texted. With no hash to check against,
  /// the six digits are accepted and the server has the final say.
  Future<void> _verify(TripStop d) async {
    final code = _code.text.trim();
    if (!RegExp(r'^\d{6}$').hasMatch(code)) {
      setState(() {
        _otpVerified = false;
        _otpError = 'The code is 6 digits';
      });
      return;
    }
    final hash = d.stop.deliveryCode;
    if (!ref.read(tripsRepositoryProvider).usesCodes) {
      // Demo data: one fixed code stands in for the outlet's SMS.
      if (code != demoDeliveryCode) {
        setState(() {
          _otpVerified = false;
          _otpError = 'That code does not match the one sent to the outlet';
        });
        return;
      }
    } else if (hash != null) {
      setState(() => _busy = true);
      final ok = await ref.read(deliveryCodeVerifierProvider)(code, hash);
      if (!mounted) return;
      setState(() => _busy = false);
      if (!ok) {
        setState(() {
          _otpVerified = false;
          _otpError = 'That code does not match the one sent to the outlet';
        });
        return;
      }
    }
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() {
      _otpVerified = true;
      _otpError = null;
    });
  }

  Future<void> _complete(TripStop d) async {
    setState(() => _submitted = true);
    if (_name.text.trim().isEmpty || !_hasProof) return;
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

    setState(() => _busy = true);
    try {
      final actions = ref.read(tripActionsProvider);
      final entered = ref.read(deliveredQuantitiesProvider);
      final byCode = _mode == _otp;
      // A photo is the proof that lets a stop complete without the outlet's
      // code; with the code, the code is the proof.
      if (!byCode) {
        await actions.submitProof(
          widget.tripId,
          widget.stopId,
          ids: _ids,
          receivedBy: _name.text.trim(),
          notes: _notes.text,
          photo: _photo,
        );
      }
      await actions.completeStop(
        widget.tripId,
        widget.stopId,
        deliveredCases: {
          for (final o in d.stop.orders) o.id: entered[o.id] ?? o.cases,
        },
        deliveryCode: byCode ? _code.text.trim() : null,
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
                    _receivedByCard(d),
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

  Widget _otpPanel(TripStop d) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.background,
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Enter OTP', style: AppText.textSmBold),
          const SizedBox(height: 4),
          Text(
            'Ask the store for the code they were texted.',
            style: AppText.textXsRegular.copyWith(color: AppColors.inkMuted),
          ),
          const SizedBox(height: 12),
          OtpBoxes(
            controller: _code,
            error: _otpError != null,
            onChanged: (_) => setState(() {
              _otpVerified = false;
              _otpError = null;
            }),
          ),
          if (_otpError != null)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                _otpError!,
                style: AppText.textXsRegular.copyWith(color: AppColors.red700),
              ),
            ),
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.centerRight,
            child: _otpVerified
                ? Row(
                    key: const Key('otp-verified'),
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.check_circle_rounded,
                        size: 18,
                        color: AppColors.lime700,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        'Verified',
                        style: AppText.textSmSemibold.copyWith(
                          color: AppColors.lime700,
                        ),
                      ),
                    ],
                  )
                : SizedBox(
                    width: 120,
                    child: AppButton(
                      key: const Key('otp-verify'),
                      label: 'Verify',
                      dense: true,
                      isLoading: _busy,
                      onPressed: () => _verify(d),
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _receivedByCard(TripStop d) {
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
            labels: const ['OTP', 'Photo'],
            selectedIndex: _mode,
            onChanged: (i) => setState(() => _mode = i),
          ),
          const SizedBox(height: 10),
          if (_mode == _otp)
            _otpPanel(d)
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
