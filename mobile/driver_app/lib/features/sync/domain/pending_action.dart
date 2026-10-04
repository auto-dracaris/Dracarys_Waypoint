/// What the driver did that has to reach the server.
enum ActionKind {
  arrive,
  complete,
  proof,
  issue,
  ackRoute;

  /// Steps at one stop that must reach the server in order: arrival, then the
  /// proof, then the completion. If one is turned down, the ones after it
  /// cannot be sent.
  bool get isStopStep =>
      this == ActionKind.arrive ||
      this == ActionKind.proof ||
      this == ActionKind.complete;
}

enum ActionState {
  /// Waiting to be sent (or being retried).
  pending,

  /// The server refused it. It stays in the list so the driver can see why,
  /// and is only removed when they dismiss it.
  rejected,
}

/// A photo or signature kept in the [LocalStore] until its action is sent.
class BlobRef {
  const BlobRef({
    required this.name,
    required this.filename,
    required this.contentType,
  });

  final String name;
  final String filename;
  final String contentType;

  Map<String, Object?> toJson() => {
    'name': name,
    'filename': filename,
    'contentType': contentType,
  };

  factory BlobRef.fromJson(Map<String, dynamic> j) => BlobRef(
    name: j['name'] as String,
    filename: j['filename'] as String,
    contentType: j['contentType'] as String,
  );
}

/// One action on the device's to-do list. [body] is exactly what will be sent
/// (it carries the action's own `clientId`, so sending it twice stores it once)
/// plus whatever the executor needs to build the calls; [blobs] are its files.
class PendingAction {
  const PendingAction({
    required this.id,
    required this.kind,
    required this.tripId,
    required this.createdAt,
    required this.body,
    this.stopId,
    this.meta = const {},
    this.blobs = const {},
    this.state = ActionState.pending,
    this.error,
    this.attempts = 0,
  });

  final String id;
  final ActionKind kind;
  final String tripId;
  final String? stopId;
  final DateTime createdAt;
  final Map<String, Object?> body;

  /// Only for showing the action on the phone (the stop's name, say); never
  /// sent to the server.
  final Map<String, Object?> meta;
  final Map<String, BlobRef> blobs;
  final ActionState state;
  final String? error;
  final int attempts;

  bool get isPending => state == ActionState.pending;

  PendingAction copyWith({ActionState? state, String? error, int? attempts}) =>
      PendingAction(
        id: id,
        kind: kind,
        tripId: tripId,
        stopId: stopId,
        createdAt: createdAt,
        body: body,
        meta: meta,
        blobs: blobs,
        state: state ?? this.state,
        error: error ?? this.error,
        attempts: attempts ?? this.attempts,
      );

  Map<String, Object?> toJson() => {
    'id': id,
    'kind': kind.name,
    'tripId': tripId,
    'stopId': stopId,
    'createdAt': createdAt.toIso8601String(),
    'body': body,
    'meta': meta,
    'blobs': {for (final e in blobs.entries) e.key: e.value.toJson()},
    'state': state.name,
    'error': error,
    'attempts': attempts,
  };

  factory PendingAction.fromJson(Map<String, dynamic> j) => PendingAction(
    id: j['id'] as String,
    kind: ActionKind.values.byName(j['kind'] as String),
    tripId: j['tripId'] as String,
    stopId: j['stopId'] as String?,
    createdAt: DateTime.parse(j['createdAt'] as String),
    body: Map<String, Object?>.from(j['body'] as Map),
    meta: Map<String, Object?>.from((j['meta'] as Map?) ?? const {}),
    blobs: {
      for (final e in (j['blobs'] as Map).entries)
        e.key as String: BlobRef.fromJson(
          Map<String, dynamic>.from(e.value as Map),
        ),
    },
    state: ActionState.values.byName(j['state'] as String),
    error: j['error'] as String?,
    attempts: (j['attempts'] as num?)?.toInt() ?? 0,
  );

  /// A line for the "waiting to sync" list.
  String get title => switch (kind) {
    ActionKind.arrive => 'Arrival recorded',
    ActionKind.complete => 'Stop completed',
    ActionKind.proof => 'Proof of delivery',
    ActionKind.issue => 'Issue report',
    ActionKind.ackRoute => 'Route change acknowledged',
  };
}
