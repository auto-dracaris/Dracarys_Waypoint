import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';

import 'dart:async';

import '../../../core/api/api_providers.dart';
import '../../../core/clock.dart';
import '../../../core/format.dart';
import '../../../core/router/routes.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/online_status_pill.dart';
import '../../../core/widgets/segmented_control.dart';
import '../data/http_notifications_repository.dart';
import '../data/notifications_providers.dart';
import '../domain/app_notification.dart';
import 'widgets/notification_card.dart';

/// The "Updates" tab (Figma "2 — Notifications").
class UpdatesScreen extends ConsumerStatefulWidget {
  const UpdatesScreen({super.key});

  @override
  ConsumerState<UpdatesScreen> createState() => _UpdatesScreenState();
}

class _UpdatesScreenState extends ConsumerState<UpdatesScreen> {
  static const _all = 0;
  static const _errors = 1;

  int _filter = _all;

  @override
  Widget build(BuildContext context) {
    final items = ref.watch(notificationsProvider);
    final now = ref.watch(clockProvider)();

    return Scaffold(
      backgroundColor: AppColors.surface,
      body: Column(
        children: [
          _TopBar(onBack: () => context.go('/trips')),
          Expanded(
            child: AsyncValueView(
              value: items,
              onRetry: () => ref.invalidate(notificationsProvider),
              isEmpty: (l) => l.isEmpty,
              emptyMessage: 'No updates',
              data: (all) => _Feed(
                all: all,
                now: now,
                filter: _filter,
                onFilterChanged: (i) => setState(() => _filter = i),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({required this.onBack});

  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.surface,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: SafeArea(
        bottom: false,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            InkWell(
              key: const Key('back-link'),
              onTap: onBack,
              child: Row(
                children: [
                  SvgPicture.asset('assets/images/arrow_left.svg',
                      width: 23, height: 23),
                  const SizedBox(width: 11),
                  Text('My trips',
                      style: AppText.outfit(15.5, AppColors.outfitInk)),
                ],
              ),
            ),
            const OnlineStatusPill(),
          ],
        ),
      ),
    );
  }
}

void _open(BuildContext context, AppNotification n) {
  // A server notification opened counts as read.
  if (n.type != null && !n.read) {
    final container = ProviderScope.containerOf(context);
    unawaited(
      HttpNotificationsRepository(container.read(apiClientProvider))
          .markRead(n.id)
          .then((_) => container.invalidate(notificationsProvider)),
    );
  }
  final tripId = n.tripId;
  if (tripId == null) return;
  context.go(n.kind == NotificationKind.stopSequenceChanged
      ? AppRoutes.routeUpdate(tripId)
      : AppRoutes.trip(tripId));
}

class _Feed extends StatelessWidget {
  const _Feed({
    required this.all,
    required this.now,
    required this.filter,
    required this.onFilterChanged,
  });

  final List<AppNotification> all;
  final DateTime now;
  final int filter;
  final ValueChanged<int> onFilterChanged;

  @override
  Widget build(BuildContext context) {
    final errors = all
        .where((n) => n.severity == NotificationSeverity.error)
        .toList();
    final shown = filter == _UpdatesScreenState._errors ? errors : all;

    // Group by calendar day, keeping the newest-first order.
    final groups = <String, List<AppNotification>>{};
    for (final n in shown) {
      groups.putIfAbsent(dayLabel(n.createdAt, now), () => []).add(n);
    }

    return ListView(
      padding: EdgeInsets.zero,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
          child: Text('Notifications', style: AppText.displaySm),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: SegmentedControl(
            segments: [
              Segment(label: 'All', count: all.length),
              Segment(label: 'Errors', count: errors.length),
            ],
            selectedIndex: filter,
            onChanged: onFilterChanged,
          ),
        ),
        if (shown.isEmpty)
          Padding(
            padding: const EdgeInsets.all(32),
            child: Center(
              child: Text('No errors',
                  style: AppText.textSmRegular
                      .copyWith(color: AppColors.inkMuted)),
            ),
          ),
        for (final entry in groups.entries) ...[
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
            child: Text(entry.key,
                style: AppText.outfit(14, AppColors.sectionLabel,
                    lineHeight: 20)),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
            child: Column(
              children: [
                for (var i = 0; i < entry.value.length; i++) ...[
                  if (i > 0) const SizedBox(height: 4),
                  NotificationCard(
                    key: Key('notification-${entry.value[i].id}'),
                    notification: entry.value[i],
                    now: now,
                    onAction: () => _open(context, entry.value[i]),
                  ),
                ],
              ],
            ),
          ),
        ],
      ],
    );
  }
}
