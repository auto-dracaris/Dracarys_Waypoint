import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/clock.dart';
import '../../../core/storage/offline_cache.dart';
import '../../../core/uuid.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../trips/data/trips_providers.dart';
import '../../trips/domain/trip.dart';
import '../data/assistant_providers.dart';
import '../data/assistant_repository.dart';
import '../domain/chat_message.dart';

class ChatState {
  const ChatState({
    this.messages = const [],
    this.sending = false,
    this.conversationId,
  });

  final List<ChatMessage> messages;

  /// A question is out and the assistant has not answered yet.
  final bool sending;

  /// The service's id for this conversation; sent with follow-ups so it
  /// remembers the earlier questions.
  final String? conversationId;

  bool get isEmpty => messages.isEmpty;

  ChatState copyWith({
    List<ChatMessage>? messages,
    bool? sending,
    String? conversationId,
    bool clearConversation = false,
  }) => ChatState(
    messages: messages ?? this.messages,
    sending: sending ?? this.sending,
    conversationId: clearConversation
        ? null
        : conversationId ?? this.conversationId,
  );
}

/// The conversation with the assistant. It is kept on the phone (per driver),
/// so it is still there after a restart and can be read with no signal.
class ChatController extends Notifier<ChatState> {
  static const _key = 'chat';
  static const _keep = 60;

  @override
  ChatState build() {
    // A different driver gets a fresh conversation; editing the profile of the
    // same driver does not.
    ref.watch(authControllerProvider.select((a) => a.value?.id));
    Future.microtask(_restore);
    return const ChatState();
  }

  OfflineCache get _cache => ref.read(offlineCacheProvider);

  Future<void> _restore() async {
    try {
      final saved = await _cache.getJson(_key);
      if (saved is! Map || state.messages.isNotEmpty) return;
      state = ChatState(
        conversationId: saved['conversationId'] as String?,
        messages: [
          for (final m in (saved['messages'] as List? ?? const []))
            ChatMessage.fromJson(Map<String, dynamic>.from(m as Map)),
        ],
      );
    } catch (_) {
      // A damaged history is not worth stopping the chat for.
    }
  }

  Future<void> _save() async {
    try {
      final tail = state.messages.length > _keep
          ? state.messages.sublist(state.messages.length - _keep)
          : state.messages;
      await _cache.putJson(_key, {
        'conversationId': state.conversationId,
        'messages': [for (final m in tail) m.toJson()],
      });
    } catch (_) {}
  }

  /// The trip the driver is most likely asking about: the one under way, else
  /// the first that is not finished.
  String? _currentTripId() {
    final trips = ref.read(tripsProvider).value;
    if (trips == null) return null;
    for (final t in trips) {
      if (t.status == TripStatus.inProgress) return t.id;
    }
    for (final t in trips) {
      if (t.status != TripStatus.completed) return t.id;
    }
    return null;
  }

  ChatMessage _message(
    ChatRole role,
    String text, {
    List<ChatSource> sources = const [],
    bool failed = false,
  }) => ChatMessage(
    id: newUuid(),
    role: role,
    text: text,
    sentAt: ref.read(clockProvider)(),
    sources: sources,
    failed: failed,
  );

  Future<void> send(String text) async {
    final question = text.trim();
    if (question.isEmpty || state.sending) return;
    state = state.copyWith(
      messages: [...state.messages, _message(ChatRole.user, question)],
      sending: true,
    );
    await _ask(question);
  }

  /// Asks again after a failure: the failed answer is removed and the same
  /// question goes out once more.
  Future<void> retry() async {
    if (state.sending) return;
    final messages = [...state.messages];
    if (messages.isEmpty || !messages.last.failed) return;
    messages.removeLast();
    final question = messages
        .lastWhere((m) => m.isUser, orElse: () => messages.last)
        .text;
    state = state.copyWith(messages: messages, sending: true);
    await _ask(question);
  }

  Future<void> _ask(String question) async {
    try {
      final reply = await ref
          .read(assistantRepositoryProvider)
          .ask(
            message: question,
            conversationId: state.conversationId,
            tripId: _currentTripId(),
          );
      state = state.copyWith(
        messages: [
          ...state.messages,
          _message(ChatRole.assistant, reply.answer, sources: reply.sources),
        ],
        conversationId: reply.conversationId,
        sending: false,
      );
    } on AssistantException catch (e) {
      state = state.copyWith(
        messages: [
          ...state.messages,
          _message(ChatRole.assistant, e.message, failed: e.retryable),
        ],
        sending: false,
      );
    } catch (_) {
      state = state.copyWith(
        messages: [
          ...state.messages,
          _message(
            ChatRole.assistant,
            'Something went wrong. Please try again.',
            failed: true,
          ),
        ],
        sending: false,
      );
    }
    await _save();
  }

  /// Starts over: the assistant forgets the earlier questions.
  Future<void> newChat() async {
    state = const ChatState();
    try {
      await _cache.remove(_key);
    } catch (_) {}
  }
}

final chatControllerProvider = NotifierProvider<ChatController, ChatState>(
  ChatController.new,
);
