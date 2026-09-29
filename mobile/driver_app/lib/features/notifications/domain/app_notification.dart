enum NotificationSeverity { error, warning, info, success }

class AppNotification {
  const AppNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.createdAt,
    required this.severity,
    this.tripId,
    this.actionLabel,
    this.footnote,
  });

  final String id;
  final String title;
  final String body;
  final DateTime createdAt;
  final NotificationSeverity severity;
  final String? tripId;
  final String? actionLabel;
  final String? footnote;
}
