import 'package:flutter/material.dart';

import '../../../../core/format.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text.dart';
import '../../domain/app_notification.dart';

/// One card in the Updates feed. Colours follow the notification's severity,
/// the icon follows its kind (Figma "Notification card").
class NotificationCard extends StatelessWidget {
  const NotificationCard({
    super.key,
    required this.notification,
    required this.now,
    required this.onAction,
  });

  final AppNotification notification;
  final DateTime now;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
    final style = _CardStyle.of(notification.severity);
    final action = notification.actionLabel;
    return Container(
      clipBehavior: Clip.antiAlias,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: style.background,
        border: Border.all(color: style.border),
        borderRadius: BorderRadius.circular(style.radius),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _Header(notification: notification, style: style, now: now),
          if (action != null) ...[
            const SizedBox(height: 32),
            notification.severity == NotificationSeverity.error
                ? _FilledAction(label: action, onTap: onAction)
                : _OutlinedAction(label: action, onTap: onAction),
          ],
        ],
      ),
    );
  }
}

class _CardStyle {
  const _CardStyle({
    required this.background,
    required this.border,
    required this.radius,
    required this.iconBackground,
    required this.iconColor,
  });

  final Color background;
  final Color border;
  final double radius;
  final Color iconBackground;
  final Color iconColor;

  static _CardStyle of(NotificationSeverity severity) => switch (severity) {
        NotificationSeverity.error => const _CardStyle(
            background: AppColors.red50,
            border: AppColors.red100,
            radius: 12,
            iconBackground: AppColors.orange50,
            iconColor: AppColors.red700,
          ),
        NotificationSeverity.warning => const _CardStyle(
            background: AppColors.yellow50,
            border: AppColors.yellow300,
            radius: 8,
            iconBackground: AppColors.orange50,
            iconColor: AppColors.yellow600,
          ),
        NotificationSeverity.info => const _CardStyle(
            background: AppColors.surface,
            border: AppColors.border,
            radius: 8,
            iconBackground: AppColors.gray50,
            iconColor: AppColors.ink,
          ),
        NotificationSeverity.success => const _CardStyle(
            background: AppColors.card,
            border: AppColors.border,
            radius: 8,
            iconBackground: AppColors.green50,
            iconColor: AppColors.green600,
          ),
      };
}

IconData _iconFor(NotificationKind kind) => switch (kind) {
      NotificationKind.stopSequenceChanged => Icons.location_on,
      NotificationKind.loadingStarted => Icons.inventory_2,
      NotificationKind.tripAssigned => Icons.calendar_month,
      NotificationKind.savedOffline => Icons.cloud_done,
      NotificationKind.tripReady => Icons.check_circle,
      NotificationKind.issueUpdate => Icons.report_problem,
      NotificationKind.general => Icons.notifications,
    };

class _Header extends StatelessWidget {
  const _Header({
    required this.notification,
    required this.style,
    required this.now,
  });

  final AppNotification notification;
  final _CardStyle style;
  final DateTime now;

  @override
  Widget build(BuildContext context) {
    final footnote = notification.footnote;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 32,
          height: 32,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: style.iconBackground,
            shape: BoxShape.circle,
          ),
          child: Icon(_iconFor(notification.kind),
              size: 24, color: style.iconColor),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(notification.title,
                        style: AppText.textSmBold),
                  ),
                  const SizedBox(width: 8),
                  Text(formatNotificationTime(notification.createdAt, now),
                      style: AppText.textXsRegular
                          .copyWith(color: AppColors.inkMuted)),
                ],
              ),
              const SizedBox(height: 6),
              Text(notification.body,
                  style: AppText.textSmRegular
                      .copyWith(color: AppColors.inkSecondary)),
              if (footnote != null) ...[
                const SizedBox(height: 6),
                Text(footnote,
                    style: AppText.textXsRegular
                        .copyWith(color: AppColors.inkMuted)),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _FilledAction extends StatelessWidget {
  const _FilledAction({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.red500,
      borderRadius: BorderRadius.circular(4),
      child: InkWell(
        borderRadius: BorderRadius.circular(4),
        onTap: onTap,
        child: SizedBox(
          height: 36,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(label,
                  style: AppText.textMdSemibold
                      .copyWith(color: AppColors.card)),
              const SizedBox(width: 8),
              const Icon(Icons.arrow_forward_rounded,
                  size: 22, color: AppColors.card),
            ],
          ),
        ),
      ),
    );
  }
}

class _OutlinedAction extends StatelessWidget {
  const _OutlinedAction({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(4),
        side: const BorderSide(color: AppColors.navBorder),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(4),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(label, style: AppText.textSmSemibold),
              const SizedBox(width: 8),
              const Icon(Icons.arrow_forward_rounded,
                  size: 20, color: AppColors.ink),
            ],
          ),
        ),
      ),
    );
  }
}
