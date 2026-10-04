enum ChatRole { user, assistant }

/// A passage the assistant based an answer on (a policy document excerpt).
class ChatSource {
  const ChatSource({
    this.id = '',
    required this.title,
    required this.text,
    this.page,
  });

  /// The service's id for the passage (`policy:...`, `api:...`); answers cite
  /// it in square brackets.
  final String id;
  final String title;
  final String text;
  final int? page;

  Map<String, Object?> toJson() => {
    'id': id,
    'title': title,
    'text': text,
    'page': page,
  };

  factory ChatSource.fromJson(Map<String, dynamic> j) => ChatSource(
    id: (j['id'] as String?) ?? '',
    title: (j['title'] as String?) ?? 'Source',
    text: (j['text'] as String?) ?? '',
    page: (j['page'] as num?)?.toInt(),
  );
}

/// One bubble in the conversation.
class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.role,
    required this.text,
    required this.sentAt,
    this.sources = const [],
    this.failed = false,
  });

  final String id;
  final ChatRole role;
  final String text;
  final DateTime sentAt;
  final List<ChatSource> sources;

  /// A message of the driver's that could not be delivered: shown with a
  /// retry. (The assistant's own failures are shown as a bubble with this set.)
  final bool failed;

  bool get isUser => role == ChatRole.user;

  ChatMessage copyWith({bool? failed}) => ChatMessage(
    id: id,
    role: role,
    text: text,
    sentAt: sentAt,
    sources: sources,
    failed: failed ?? this.failed,
  );

  Map<String, Object?> toJson() => {
    'id': id,
    'role': role.name,
    'text': text,
    'sentAt': sentAt.toIso8601String(),
    'sources': [for (final s in sources) s.toJson()],
    'failed': failed,
  };

  factory ChatMessage.fromJson(Map<String, dynamic> j) => ChatMessage(
    id: j['id'] as String,
    role: ChatRole.values.byName(j['role'] as String),
    text: j['text'] as String,
    sentAt: DateTime.parse(j['sentAt'] as String),
    sources: [
      for (final s in (j['sources'] as List? ?? const []))
        ChatSource.fromJson(Map<String, dynamic>.from(s as Map)),
    ],
    failed: j['failed'] == true,
  );
}

/// What the assistant service answered.
class AssistantReply {
  const AssistantReply({
    required this.conversationId,
    required this.answer,
    this.sources = const [],
    this.status = 'answered',
  });

  final String conversationId;
  final String answer;
  final List<ChatSource> sources;

  /// The service's own verdict: `answered`, `no_knowledge`, `needs_input`, ...
  final String status;
}
