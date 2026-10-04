import '../../../core/api/api_client.dart';
import '../../../core/api/api_exception.dart';
import '../domain/chat_message.dart';
import 'assistant_repository.dart';

final _uuid = RegExp(
  r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
  caseSensitive: false,
);

/// The AI assistant service (`ai-service`, `POST /api/v1/chat`).
///
/// A driver's questions use the `business_qa` workflow: the service checks the
/// same access token as the main API, then answers from the driver's own trips
/// and route changes (read-only) and from the approved delivery and incident
/// policies. It cannot change anything.
class HttpAssistantRepository implements AssistantRepository {
  HttpAssistantRepository(this._api, {required this.baseUrl});

  final ApiClient _api;

  /// The service root, without `/api/v1/chat`. Empty when it is not set up.
  final String baseUrl;

  /// Answers can take a while: the service allows itself 30 seconds.
  static const _timeout = Duration(seconds: 45);

  @override
  Future<AssistantReply> ask({
    required String message,
    String? conversationId,
    String? tripId,
  }) async {
    if (baseUrl.isEmpty) {
      throw const AssistantException(
        'The assistant is not set up on this server yet.',
        retryable: false,
      );
    }
    try {
      final data = await _api.postJson(
        '${baseUrl.replaceAll(RegExp(r'/+$'), '')}/api/v1/chat',
        body: {
          'message': message,
          'workflow': 'business_qa',
          'conversation_id': ?conversationId,
          // The service only accepts a real trip UUID.
          if (tripId != null && _uuid.hasMatch(tripId)) 'trip_id': tripId,
        },
        timeout: _timeout,
      ) as Map<String, dynamic>;
      final sources = [
        for (final s in (data['sources'] as List? ?? const []))
          ChatSource.fromJson(Map<String, dynamic>.from(s as Map)),
      ];
      return AssistantReply(
        conversationId: data['conversation_id'] as String,
        answer: HttpAssistantRepository.readableCitations(
          (data['answer'] as String?) ?? '',
          sources,
        ),
        status: (data['status'] as String?) ?? 'answered',
        sources: sources,
      );
    } on ApiException catch (e) {
      throw AssistantException(_friendly(e));
    }
  }

  /// The service marks where an answer drew on a source with ids in brackets,
  /// like `[policy:ab12]` or `[api:trips, policy:cd34]`. A driver should see the
  /// source's number, matching the numbered cards under the answer; a marker whose
  /// ids are not all among [sources] is left as it is.
  static String readableCitations(String answer, List<ChatSource> sources) =>
      answer.replaceAllMapped(
        RegExp(r'\[((?:api:|policy:|identity:|runtime:)[^\]]+)\]'),
        (m) {
          final numbers = [
            for (final id in m.group(1)!.split(','))
              sources.indexWhere((s) => s.id == id.trim()) + 1,
          ];
          return numbers.every((n) => n > 0)
              ? '[${numbers.join(', ')}]'
              : m.group(0)!;
        },
      );

  String _friendly(ApiException e) => switch (e.statusCode) {
    0 => "Can't reach the assistant. Check your connection.",
    401 => 'Your session has expired. Sign in again to use the assistant.',
    403 => 'The assistant is not available for your account.',
    502 || 503 => 'The assistant is unavailable right now. Try again soon.',
    504 => 'The assistant took too long to answer. Try asking again.',
    409 => 'This conversation is busy. Try again in a moment.',
    _ => e.message,
  };
}
