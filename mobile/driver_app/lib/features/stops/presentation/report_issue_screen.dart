import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/error_message.dart';
import '../../../core/connectivity/online_provider.dart';
import '../../../core/photos/photo_picker.dart';
import '../../../core/uuid.dart';
import '../../../core/router/routes.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/dropdown_field.dart';
import '../../../core/widgets/labeled_field.dart';
import '../../../core/widgets/photo_tiles.dart';
import '../../../core/widgets/quantity_stepper.dart';
import '../../../core/widgets/trip_header_bar.dart';
import '../../trips/application/trip_actions.dart';
import '../../trips/data/trips_providers.dart';
import '../../trips/domain/order.dart';
import '../../trips/presentation/widgets/temperature_chip.dart';
import '../data/http_stop_reports_repository.dart';

String _cases(int n) => '$n ${n == 1 ? 'case' : 'cases'}';

/// Delivery exception form (Figma "driver-delivery-exception"): report damaged
/// or missing goods for one order so the dispatcher can decide.
class ReportIssueScreen extends ConsumerStatefulWidget {
  const ReportIssueScreen({
    super.key,
    required this.tripId,
    required this.stopId,
    required this.orderId,
  });

  final String tripId;
  final String stopId;
  final String orderId;

  @override
  ConsumerState<ReportIssueScreen> createState() => _ReportIssueScreenState();
}

class _ReportIssueScreenState extends ConsumerState<ReportIssueScreen> {
  final _note = TextEditingController();
  String? _type;
  int _affected = 1;
  PickedPhoto? _photo;
  final _clientId = newUuid();
  final _photoId = newUuid();
  bool _busy = false;

  StopRef get _ref => (tripId: widget.tripId, stopId: widget.stopId);

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  List<String> _typesFor(Order order) => [
    'Damaged goods — ${order.temperature.name}',
    'Temperature breach',
    'Short delivery',
    'Wrong items',
    'Other',
  ];

  /// The labels the form offers, with the API issue type each one sends.
  static const _apiTypes = [
    issueTypeDamaged,
    issueTypeTemperature,
    issueTypeShort,
    issueTypeWrongItems,
    issueTypeOther,
  ];

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

  Future<void> _save(Order order, List<String> types) async {
    setState(() => _busy = true);
    try {
      final index = types.indexOf(_type ?? types.first);
      await ref
          .read(tripActionsProvider)
          .reportIssue(
            widget.tripId,
            report: IssueReport(
              clientId: _clientId,
              orderId: order.id,
              type: _apiTypes[index < 0 ? 0 : index],
              affectedCases: _affected.clamp(1, order.cases),
              note: _note.text,
              photo: _photo,
              photoId: _photoId,
            ),
          );
      if (!mounted) return;
      final online = ref.read(onlineProvider);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            online
                ? 'Issue reported to the dispatcher'
                : 'Issue saved on this device — waiting to sync',
          ),
        ),
      );
      context.go(AppRoutes.arrived(widget.tripId, widget.stopId));
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
              data: (d) {
                final order = d.stop.orders
                    .where((o) => o.id == widget.orderId)
                    .firstOrNull;
                if (order == null) {
                  return const Center(child: Text('Something went wrong'));
                }
                return _form(d, order);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _form(TripStop d, Order order) {
    final types = _typesFor(order);
    final type = _type ?? types.first;
    final affected = _affected.clamp(1, order.cases);
    final deliverable = order.cases - affected;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _card(
            gap: 12,
            children: [
              Text(
                'STOP ${d.stop.sequence} OF ${d.trip.stops.length}',
                style: AppText.textXsMedium.copyWith(color: AppColors.inkMuted),
              ),
              Text(d.stop.name, style: AppText.textLgSemibold),
              const Divider(height: 1, thickness: 1, color: AppColors.border),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Reporting issue for order',
                        style: AppText.textXsRegular.copyWith(
                          color: AppColors.inkSecondary,
                        ),
                      ),
                      Text(order.id, style: AppText.textSmSemibold),
                    ],
                  ),
                  TemperatureChip(
                    order.temperature,
                    style: TemperatureChipStyle.summary,
                    large: true,
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),
          _card(
            gap: 16,
            children: [
              Text('Quantity Breakdown', style: AppText.textSmBold),
              Row(
                children: [
                  Expanded(
                    child: _StatTile(
                      label: 'PLANNED',
                      value: '${order.cases}',
                      unit: 'cases',
                      background: AppColors.gray50,
                      border: AppColors.border,
                      labelColor: AppColors.inkMuted,
                      valueColor: AppColors.ink,
                      unitColor: AppColors.inkSecondary,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _StatTile(
                      label: 'AFFECTED',
                      value: '$affected',
                      unit: 'damaged',
                      background: AppColors.red50,
                      border: AppColors.red200,
                      labelColor: AppColors.red700,
                      valueColor: AppColors.red700,
                      unitColor: AppColors.red700,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _StatTile(
                      label: 'DELIVERABLE',
                      value: '$deliverable',
                      unit: 'cases',
                      background: AppColors.lime50,
                      border: AppColors.lime300,
                      labelColor: AppColors.lime800,
                      valueColor: AppColors.lime700,
                      unitColor: AppColors.lime800,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),
          _card(
            gap: 16,
            children: [
              Text('Issue Details', style: AppText.textSmBold),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Issue Type',
                    style: AppText.textSmMedium.copyWith(
                      color: AppColors.inkSecondary,
                    ),
                  ),
                  const SizedBox(height: 6),
                  DropdownField<String>(
                    value: type,
                    options: types,
                    label: (v) => v,
                    onChanged: (v) => setState(() => _type = v),
                  ),
                ],
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Affected Quantity',
                        style: AppText.textSmMedium.copyWith(
                          color: AppColors.inkSecondary,
                        ),
                      ),
                      Text(
                        'Enter number of damaged cases',
                        style: AppText.textXsRegular.copyWith(
                          color: AppColors.inkMuted,
                        ),
                      ),
                    ],
                  ),
                  QuantityStepper(
                    style: QuantityStepperStyle.joined,
                    value: affected,
                    min: 1,
                    max: order.cases,
                    onChanged: (v) => setState(() => _affected = v),
                  ),
                ],
              ),
              LabeledField(
                label: 'Short Note',
                hint: 'Describe what happened…',
                controller: _note,
                minLines: 3,
                maxLines: 3,
                fillColor: AppColors.gray50,
                borderColor: AppColors.neutral300,
                labelStyle: AppText.textSmMedium.copyWith(
                  color: AppColors.inkSecondary,
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Attach photo evidence (recommended)',
                    style: AppText.textSmMedium.copyWith(
                      color: AppColors.inkSecondary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      if (_photo != null) ...[
                        PhotoThumb(
                          bytes: _photo!.bytes,
                          onRemove: () => setState(() => _photo = null),
                        ),
                        const SizedBox(width: 12),
                      ],
                      // The API takes one photo; picking again replaces it.
                      AddPhotoTile(onTap: _takePhoto),
                    ],
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),
          _DispatcherNotice(affected: affected, deliverable: deliverable),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Row(
              children: [
                const Icon(
                  Icons.cloud_queue,
                  size: 16,
                  color: AppColors.inkMuted,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Saved on this device; report will send when connected.',
                    style: AppText.textXsRegular.copyWith(
                      color: AppColors.inkMuted,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          AppButton(
            label: 'Save and report issue',
            padding: 14,
            radius: 12,
            trailingIcon: Icons.send_rounded,
            isLoading: _busy,
            onPressed: () => _save(order, types),
          ),
          const SizedBox(height: 12),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              'Continue to next stop — delivery for this order is paused until dispatcher responds.',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontFamily: 'Inter',
                fontSize: 12,
                height: 16 / 12,
                color: AppColors.inkSecondary,
              ),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _card({required List<Widget> children, required double gap}) {
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
          for (var i = 0; i < children.length; i++) ...[
            if (i > 0) SizedBox(height: gap),
            children[i],
          ],
        ],
      ),
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({
    required this.label,
    required this.value,
    required this.unit,
    required this.background,
    required this.border,
    required this.labelColor,
    required this.valueColor,
    required this.unitColor,
  });

  final String label;
  final String value;
  final String unit;
  final Color background;
  final Color border;
  final Color labelColor;
  final Color valueColor;
  final Color unitColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: background,
        border: Border.all(color: border),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: AppText.textXsMedium.copyWith(color: labelColor)),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: valueColor,
            ),
          ),
          const SizedBox(height: 4),
          Text(unit, style: AppText.textXsRegular.copyWith(color: unitColor)),
        ],
      ),
    );
  }
}

class _DispatcherNotice extends StatelessWidget {
  const _DispatcherNotice({required this.affected, required this.deliverable});

  final int affected;
  final int deliverable;

  @override
  Widget build(BuildContext context) {
    Widget bullet(Color color, String text) => Row(
      children: [
        Container(
          width: 6,
          height: 6,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            text,
            style: AppText.textXsMedium.copyWith(color: AppColors.inkSecondary),
          ),
        ),
      ],
    );

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.yellow50,
        border: Border.all(color: AppColors.yellow300),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.gavel, size: 20, color: AppColors.yellow600),
              const SizedBox(width: 8),
              Text('Dispatcher review required', style: AppText.textSmBold),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'This report will be sent to your dispatcher. They will decide whether to proceed with partial delivery or hold all goods.',
            style: AppText.textSmRegular.copyWith(
              color: AppColors.inkSecondary,
            ),
          ),
          const SizedBox(height: 12),
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Column(
              children: [
                bullet(
                  AppColors.lime500,
                  'Deliverable (${_cases(deliverable)}) — ready to hand over once approved',
                ),
                const SizedBox(height: 6),
                bullet(
                  AppColors.red500,
                  'Affected (${_cases(affected)}) — held on vehicle pending decision',
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
