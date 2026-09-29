/// How urgent a notification is; drives the card's colours and action style.
enum NotificationSeverity { error, warning, info, success }

/// What happened; drives the card's icon.
enum NotificationKind {
  stopSequenceChanged,
  loadingStarted,
  tripAssigned,
  savedOffline,
}

class AppNotification {
  const AppNotification({
    required this.id,
    required this.kind,
    required this.title,
    required this.body,
    required this.createdAt,
    required this.severity,
    this.tripId,
    this.actionLabel,
    this.footnote,
  });

  final String id;
  final NotificationKind kind;
  final String title;
  final String body;
  final DateTime createdAt;
  final NotificationSeverity severity;
  final String? tripId;
  final String? actionLabel;
  final String? footnote;
}
