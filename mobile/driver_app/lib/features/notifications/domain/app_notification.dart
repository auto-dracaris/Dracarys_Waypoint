/// How urgent a notification is; drives the card's colours and action style.
enum NotificationSeverity { error, warning, info, success }

/// What happened; drives the card's icon.
enum NotificationKind {
  stopSequenceChanged,
  loadingStarted,
  tripAssigned,
  savedOffline,
  tripReady,
  issueUpdate,

  /// A type this version does not know: shown with its words and no action.
  general,
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
    this.type,
    this.read = true,
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

  /// The server's notification type (`route_changed`, ...), when it came from
  /// the server.
  final String? type;

  /// Notifications the server has not been told are read stay false.
  final bool read;
}
