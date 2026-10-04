import '../../../core/uuid.dart';
import '../domain/chat_message.dart';
import 'assistant_repository.dart';

/// A scripted assistant for demo data and tests: answers a handful of
/// delivery questions from keywords, with a policy excerpt where the real
/// service would cite one. It says plainly when it has no answer.
class MockAssistantRepository implements AssistantRepository {
  MockAssistantRepository({this.latency = const Duration(milliseconds: 900)});

  final Duration latency;

  /// Every question asked, in order (for tests).
  final asked = <String>[];

  @override
  Future<AssistantReply> ask({
    required String message,
    String? conversationId,
    String? tripId,
  }) async {
    asked.add(message);
    await Future<void>.delayed(latency);
    final q = message.toLowerCase();
    final id = conversationId ?? newUuid();

    AssistantReply reply(
      String answer, {
      List<ChatSource> sources = const [],
      String status = 'answered',
    }) => AssistantReply(
      conversationId: id,
      answer: answer,
      sources: sources,
      status: status,
    );

    if (q.contains('error')) {
      throw const AssistantException(
        'The assistant is unavailable right now. Try again soon.',
      );
    }
    if (q.contains('next stop') || q.contains('where am i going')) {
      return reply(
        'Your next stop is **Waypoint Fresh — Ja-Ela** (stop 3 of 4).\n\n'
        '- Delivery window: 06:00–08:00\n'
        '- Planned arrival: 07:10 AM\n'
        '- Unload at the rear loading dock\n'
        '- 2 orders: one chilled, one ambient',
      );
    }
    if (q.contains('route') ||
        q.contains('changed') ||
        q.contains('sequence')) {
      return reply(
        'The dispatcher reordered your remaining stops (plan v3): '
        '**Gampaha Mall** now comes before **Waypoint Fresh**, because the '
        'mall access is restricted until 08:00. Open Updates to review and '
        'acknowledge the change.',
      );
    }
    if (q.contains('damag') || q.contains('issue') || q.contains('report')) {
      return reply(
        'Report it from the stop: open **Report an issue**, choose the order, '
        'the type (for example *Damaged goods*) and how many cases are '
        'affected, add a photo if you can, and send. The dispatcher decides '
        'whether to continue with a partial delivery. Do not leave damaged '
        'cases with the store until they have answered.',
        sources: const [
          ChatSource(
            title: 'Incident reporting policy',
            page: 2,
            text:
                'Drivers must photograph damaged goods before unloading and '
                'report the affected quantity per order. Damaged cases stay on '
                'the vehicle until the dispatcher confirms the next step.',
          ),
        ],
      );
    }
    if (q.contains('proof') || q.contains('signature') || q.contains('code')) {
      return reply(
        'At each stop you complete the delivery with the **delivery code** the '
        'store manager received by SMS. If they cannot give it, capture a '
        '**signature or a photo** with the receiver\'s name instead: that '
        'proof completes the stop and the dispatcher is told the code was not '
        'used.',
        sources: const [
          ChatSource(
            title: 'Proof of delivery',
            page: 1,
            text:
                'A delivery is confirmed by the outlet\'s six-digit code. '
                'Where the code is unavailable, a signed or photographed '
                'receipt naming the receiving staff member is accepted.',
          ),
        ],
      );
    }
    if (q.contains('cold') ||
        q.contains('temperature') ||
        q.contains('chill')) {
      return reply(
        'Chilled orders must stay **below 4°C** from loading to hand-over. If '
        'the reading rises, report a *Temperature breach* on the order right '
        'away and keep the doors closed.',
        sources: const [
          ChatSource(
            title: 'Cold chain handling',
            page: 3,
            text:
                'Chilled goods are kept below 4°C. Any breach is reported '
                'with the order reference and the time it was noticed.',
          ),
        ],
      );
    }
    if (q.contains('hello') || q.contains('hi')) {
      return reply(
        'Hi! I can tell you about your trips and stops, route '
        'changes, and the delivery rules. What do you need?',
      );
    }
    return reply(
      'I couldn\'t find that in the delivery guidance or your trips. Try '
      'asking about your next stop, a route change, proof of delivery, '
      'reporting damaged goods or chilled orders.',
      status: 'no_knowledge',
    );
  }
}
