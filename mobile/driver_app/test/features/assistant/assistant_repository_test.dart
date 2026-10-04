import 'dart:convert';

import 'package:driver_app/features/assistant/data/assistant_repository.dart';
import 'package:driver_app/features/assistant/data/http_assistant_repository.dart';
import 'package:driver_app/features/assistant/data/mock_assistant_repository.dart';
import 'package:driver_app/features/assistant/domain/chat_message.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import '../../support/offline_harness.dart';

const tripId = '11111111-1111-4111-8111-111111111111';
const convId = '22222222-2222-4222-8222-222222222222';

http.Response ok([Map<String, Object?>? extra]) => http.Response(
  jsonEncode({
    'conversation_id': convId,
    'answer': 'Your next stop is Waypoint Fresh.',
    'sources': [
      {
        'id': 's1',
        'title': 'Incident policy',
        'text': 'Photograph damaged goods.',
        'page': 2,
      },
    ],
    'status': 'answered',
    ...?extra,
  }),
  200,
  headers: {'content-type': 'application/json'},
);

http.Response detail(int status, Object detail) => http.Response(
  jsonEncode({'detail': detail}),
  status,
  headers: {'content-type': 'application/json'},
);

({HttpAssistantRepository repo, OfflineHarness h}) build(
  http.Response Function(http.Request) respond, {
  String base = 'http://ai.test:8000',
}) {
  final h = OfflineHarness(respond);
  return (repo: HttpAssistantRepository(h.api, baseUrl: base), h: h);
}

void main() {
  test(
    'asks business_qa with the access token, and reads the plain reply',
    () async {
      final t = build((_) => ok());
      final reply = await t.repo.ask(
        message: "What's my next stop?",
        conversationId: convId,
        tripId: tripId,
      );

      final req = t.h.posts.single;
      expect(req.url.toString(), 'http://ai.test:8000/api/v1/chat');
      expect(req.headers['Authorization'], 'Bearer A1');
      expect(jsonDecode(req.body), {
        'message': "What's my next stop?",
        'workflow': 'business_qa',
        'conversation_id': convId,
        'trip_id': tripId,
      });
      expect(reply.conversationId, convId);
      expect(reply.answer, 'Your next stop is Waypoint Fresh.');
      expect(reply.status, 'answered');
      expect(reply.sources.single.title, 'Incident policy');
      expect(reply.sources.single.page, 2);
    },
  );

  test(
    'a first question sends no conversation id, and a trailing slash is fine',
    () async {
      final t = build((_) => ok(), base: 'http://ai.test:8000///');
      await t.repo.ask(message: 'hi');
      final req = t.h.posts.single;
      expect(req.url.toString(), 'http://ai.test:8000/api/v1/chat');
      expect(
        (jsonDecode(req.body) as Map).containsKey('conversation_id'),
        isFalse,
      );
      expect((jsonDecode(req.body) as Map).containsKey('trip_id'), isFalse);
    },
  );

  test(
    'a trip id that is not a UUID is left out (the service rejects it)',
    () async {
      final t = build((_) => ok());
      await t.repo.ask(message: 'hi', tripId: 'trip-1');
      expect(
        (jsonDecode(t.h.posts.single.body) as Map).containsKey('trip_id'),
        isFalse,
      );
    },
  );

  test('without a configured service it says so and never calls out', () async {
    final t = build((_) => ok(), base: '');
    await expectLater(
      t.repo.ask(message: 'hi'),
      throwsA(
        isA<AssistantException>()
            .having((e) => e.retryable, 'retryable', false)
            .having((e) => e.message, 'message', contains('not set up')),
      ),
    );
    expect(t.h.sent, isEmpty);
  });

  test('service errors become sentences a driver can act on', () async {
    Future<AssistantException> failWith(http.Response r) async {
      final t = build((_) => r);
      try {
        await t.repo.ask(message: 'hi');
      } on AssistantException catch (e) {
        return e;
      }
      throw StateError('did not fail');
    }

    expect(
      (await failWith(detail(503, 'Assistant dependency unavailable'))).message,
      contains('unavailable'),
    );
    expect(
      (await failWith(detail(504, 'Assistant exceeded its execution budget')))
          .message,
      contains('too long'),
    );
    expect(
      (await failWith(detail(403, 'no'))).message,
      contains('not available'),
    );
    expect(
      (await failWith(detail(422, 'Message is too long'))).message,
      'Message is too long',
    );
    // FastAPI validation errors arrive as a list.
    expect(
      (await failWith(
        detail(422, [
          {'msg': 'String should have at least 1 character'},
        ]),
      )).message,
      'String should have at least 1 character',
    );
  });

  test(
    'no connection reads as a connection problem and can be retried',
    () async {
      final t = build((_) => ok());
      t.h.online = false;
      await expectLater(
        t.repo.ask(message: 'hi'),
        throwsA(
          isA<AssistantException>()
              .having((e) => e.retryable, 'retryable', true)
              .having((e) => e.message, 'message', contains('connection')),
        ),
      );
    },
  );

  test(
    'an expired token is refreshed once and the question goes through',
    () async {
      var chats = 0;
      final t = build((req) {
        if (req.url.path.endsWith('/auth/refresh')) {
          return http.Response(
            jsonEncode({
              'statusCode': 200,
              'message': 'ok',
              'data': {'accessToken': 'A2', 'refreshToken': 'R2'},
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return ++chats == 1 ? detail(401, 'Unauthorized') : ok();
      });
      final reply = await t.repo.ask(message: 'hi');
      expect(reply.answer, isNotEmpty);
      expect(t.h.posts.map((r) => r.url.path), [
        '/api/v1/chat',
        '/api/auth/refresh',
        '/api/v1/chat',
      ]);
      expect(t.h.posts.last.headers['Authorization'], 'Bearer A2');
    },
  );

  group('citations', () {
    const sources = [
      ChatSource(id: 'api:trips', title: 'Your trips', text: ''),
      ChatSource(id: 'policy:ab12', title: 'Incident policy', text: ''),
    ];
    String read(String answer) =>
        HttpAssistantRepository.readableCitations(answer, sources);

    test('ids in brackets become the number of the source card', () {
      expect(read('Report it [policy:ab12].'), 'Report it [2].');
      expect(
        read('Next stop is Ja-Ela [api:trips].'),
        'Next stop is Ja-Ela [1].',
      );
      expect(read('Both [api:trips, policy:ab12] agree'), 'Both [1, 2] agree');
    });

    test('a marker naming a source that was not sent is left alone', () {
      expect(read('Unknown [policy:zzzz] here'), 'Unknown [policy:zzzz] here');
      expect(
        read('Half [api:trips, policy:zzzz]'),
        'Half [api:trips, policy:zzzz]',
      );
    });

    test('ordinary brackets are not touched', () {
      expect(
        read('Use [Report an issue] then [2 cases]'),
        'Use [Report an issue] then [2 cases]',
      );
    });

    test('the reply carries the rewritten answer and the ids', () async {
      final t = build(
        (_) => http.Response(
          jsonEncode({
            'conversation_id': convId,
            'answer': 'Photograph it [policy:ab12].',
            'sources': [
              {'id': 'policy:ab12', 'title': 'Incident policy', 'text': 't'},
            ],
            'status': 'answered',
          }),
          200,
          headers: {'content-type': 'application/json'},
        ),
      );
      final reply = await t.repo.ask(message: 'hi');
      expect(reply.answer, 'Photograph it [1].');
      expect(reply.sources.single.id, 'policy:ab12');
    });
  });

  test('a busy conversation says so', () async {
    final t = build((_) => detail(409, 'busy'));
    await expectLater(
      t.repo.ask(message: 'hi'),
      throwsA(
        isA<AssistantException>().having(
          (e) => e.message,
          'message',
          contains('busy'),
        ),
      ),
    );
  });

  group('MockAssistantRepository', () {
    final mock = MockAssistantRepository(latency: Duration.zero);

    test('answers from keywords and cites a policy where it should', () async {
      final next = await mock.ask(message: "What's my next stop?");
      expect(next.answer, contains('Waypoint Fresh'));
      expect(next.sources, isEmpty);

      final dmg = await mock.ask(message: 'How do I report damaged goods?');
      expect(dmg.sources, isNotEmpty);
      expect(dmg.sources.first.title, contains('Incident'));
    });

    test('keeps the conversation id it is given, or makes one', () async {
      final first = await mock.ask(message: 'hello');
      expect(first.conversationId, isNotEmpty);
      final again = await mock.ask(
        message: 'hello',
        conversationId: first.conversationId,
      );
      expect(again.conversationId, first.conversationId);
    });

    test('admits when it has no answer, and can fail on request', () async {
      final none = await mock.ask(message: 'what is the meaning of life');
      expect(none.status, 'no_knowledge');
      await expectLater(
        mock.ask(message: 'cause an error'),
        throwsA(isA<AssistantException>()),
      );
    });
  });
}
