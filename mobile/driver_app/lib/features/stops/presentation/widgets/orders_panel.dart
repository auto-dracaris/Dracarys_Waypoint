import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text.dart';
import '../../../trips/domain/order.dart';
import '../../../trips/presentation/widgets/temperature_chip.dart';

/// Orders row on the stop overview. Collapsed: count, temperature chips and a
/// "View orders" link. Expanded: the full list of orders.
class OrdersPanel extends StatelessWidget {
  const OrdersPanel({
    super.key,
    required this.orders,
    required this.expanded,
    required this.onToggle,
  });

  final List<Order> orders;
  final bool expanded;
  final VoidCallback onToggle;

  String get _count => '${orders.length} ${orders.length == 1 ? 'order' : 'orders'}';

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(8),
      ),
      clipBehavior: Clip.antiAlias,
      child: expanded ? _expanded() : _collapsed(),
    );
  }

  Widget _collapsed() {
    final temperatures = <Temperature>[];
    for (final o in orders) {
      if (!temperatures.contains(o.temperature)) temperatures.add(o.temperature);
    }
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      child: Row(
        children: [
          const Icon(Icons.list_alt_rounded,
              size: 18, color: AppColors.inkSecondary),
          const SizedBox(width: 8),
          Text(_count, style: AppText.textSmRegular),
          for (final t in temperatures) ...[
            const SizedBox(width: 8),
            TemperatureChip(t),
          ],
          Expanded(
            child: Align(
              alignment: Alignment.centerRight,
              child: InkWell(
                key: const Key('orders-toggle'),
                onTap: onToggle,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('View orders', style: AppText.textSmMedium),
                    const SizedBox(width: 4),
                    const Icon(Icons.arrow_forward_rounded,
                        size: 14, color: AppColors.ink),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _expanded() {
    return Column(
      children: [
        InkWell(
          key: const Key('orders-toggle'),
          onTap: onToggle,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                const Icon(Icons.list_alt_rounded,
                    size: 18, color: AppColors.inkSecondary),
                const SizedBox(width: 8),
                Text(_count, style: AppText.textSmRegular),
                const Spacer(),
                const Icon(Icons.arrow_forward_rounded,
                    size: 14, color: AppColors.ink),
              ],
            ),
          ),
        ),
        for (var i = 0; i < orders.length; i++)
          _OrderItem(order: orders[i], last: i == orders.length - 1),
      ],
    );
  }
}

class _OrderItem extends StatelessWidget {
  const _OrderItem({required this.order, required this.last});

  final Order order;
  final bool last;

  @override
  Widget build(BuildContext context) {
    final delivered = order.status == OrderStatus.delivered;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: last
            ? null
            : const Border(bottom: BorderSide(color: AppColors.border)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(order.id, style: AppText.textSmBold),
              const SizedBox(width: 8),
              TemperatureChip(order.temperature),
            ],
          ),
          const SizedBox(height: 6),
          Text('${order.storeName} • ${order.cases} cases',
              style: AppText.textXsRegular
                  .copyWith(color: AppColors.inkSecondary)),
          const SizedBox(height: 6),
          Row(
            children: [
              Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(
                  color: delivered ? AppColors.lime500 : AppColors.inkFaint,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 4),
              Text(delivered ? 'Delivered' : 'Pending delivery',
                  style: AppText.textXsRegular
                      .copyWith(color: AppColors.inkMuted)),
            ],
          ),
        ],
      ),
    );
  }
}
