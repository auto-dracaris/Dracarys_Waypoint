import '../domain/chat_message.dart';

/// The assistant could not answer; [message] is fit to show the driver.
class AssistantException implements Exception {
  const AssistantException(this.message, {this.retryable = true});

  final String message;

  /// Whether asking again later could work (a busy service) as opposed to never
  /// (the assistant is not set up).
  final bool retryable;

  @override
  String toString() => message;
}

abstract interface class AssistantRepository {
  /// Asks the assistant. Pass the [conversationId] from the previous reply to
  /// continue a conversation, and the [tripId] the question is about so
  /// "my next stop" means something. Throws [AssistantException].
  Future<AssistantReply> ask({
    required String message,
    String? conversationId,
    String? tripId,
  });
}
