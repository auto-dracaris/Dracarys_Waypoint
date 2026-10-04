import 'dart:async';

import 'package:driver_app/core/connectivity/online_provider.dart';
import 'package:driver_app/core/storage/local_store.dart';
import 'package:driver_app/core/theme/app_theme.dart';
import 'package:driver_app/features/assistant/application/chat_controller.dart';
import 'package:driver_app/features/assistant/data/assistant_providers.dart';
import 'package:driver_app/features/assistant/data/assistant_repository.dart';
import 'package:driver_app/features/assistant/data/mock_assistant_repository.dart';
import 'package:driver_app/features/assistant/domain/chat_message.dart';
import 'package:driver_app/features/assistant/presentation/chat_screen.dart';
import 'package:driver_app/features/assistant/presentation/widgets/message_text.dart';
import 'package:driver_app/features/auth/data/auth_providers.dart';
import 'package:driver_app/features/auth/data/mock_auth_repository.dart';
import 'package:driver_app/features/auth/domain/driver.dart';
import 'package:driver_app/features/auth/presentation/auth_controller.dart';
import 'package:driver_app/features/trips/data/trips_providers.dart';
import 'package:driver_app/features/trips/domain/trip.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../../support/fixed_trips_repository.dart';

/// Answers when told to, so a test can look at the screen while it waits.
class _Gate implements AssistantRepository {
  final pending = <Completer<AssistantReply>>[];
  final asked = <({String message, String? conversationId, String? tripId})>[];

  @override
  Future<AssistantReply> ask({
    required String message,
    String? conversationId,
    String? tripId,
  }) {
    asked.add((
      message: message,
      conversationId: conversationId,
      tripId: tripId,
    ));
    final c = Completer<AssistantReply>();
    pending.add(c);
    return c.future;
  }

  void answer(
    String text, {
    String id = 'c1',
    List<ChatSource> sources = const [],
  }) => pending
      .removeAt(0)
      .complete(
        AssistantReply(conversationId: id, answer: text, sources: sources),
      );

  void fail(AssistantException e) => pending.removeAt(0).completeError(e);
}

List<Override> baseOverrides(
  AssistantRepository repo,
  MemoryLocalStore store, {
  List<Trip> trips = const [],
}) => [
  assistantRepositoryProvider.overrideWithValue(repo),
  localStoreProvider.overrideWithValue(store),
  authRepositoryProvider.overrideWithValue(
    MockAuthRepository(latency: Duration.zero),
  ),
  tripsRepositoryProvider.overrideWithValue(FixedTripsRepository(trips)),
  networkStatusProvider.overrideWithValue(const Stream<bool>.empty()),
];

Future<void> pumpChat(
  WidgetTester tester,
  AssistantRepository repo, {
  MemoryLocalStore? store,
  List<Override> extra = const [],
}) async {
  tester.view.physicalSize = const Size(402 * 3, 900 * 3);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  final router = GoRouter(
    routes: [
      GoRoute(path: '/', builder: (_, _) => const ChatScreen()),
      GoRoute(
        path: '/trips',
        builder: (_, _) => const Scaffold(body: Text('Trips page')),
      ),
    ],
  );
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        ...baseOverrides(repo, store ?? MemoryLocalStore()),
        ...extra,
      ],
      child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> type(WidgetTester tester, String text) async {
  await tester.enterText(find.byKey(const Key('chat-input')), text);
  await tester.pump();
}

Future<void> tapSend(WidgetTester tester) async {
  await tester.tap(find.byKey(const Key('chat-send')));
  await tester.pump();
}

void main() {
  group('the screen', () {
    testWidgets('a new chat greets and offers things to ask', (tester) async {
      await pumpChat(tester, MockAssistantRepository(latency: Duration.zero));
      expect(find.byKey(const Key('chat-welcome')), findsOneWidget);
      expect(find.text('Trip Copilot'), findsOneWidget);
      for (final (_, text) in chatSuggestions) {
        expect(find.text(text), findsOneWidget);
      }
      expect(find.byKey(const Key('chat-new')), findsNothing);
    });

    testWidgets('tapping a suggestion asks it and shows the answer', (
      tester,
    ) async {
      await pumpChat(tester, MockAssistantRepository(latency: Duration.zero));
      await tester.tap(find.text("What's my next stop?"));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('chat-welcome')), findsNothing);
      expect(find.text("What's my next stop?"), findsOneWidget); // the bubble
      expect(find.textContaining('Waypoint Fresh'), findsWidgets);
      expect(find.byKey(const Key('chat-new')), findsOneWidget);
    });

    testWidgets('typing and sending adds the question, clears the box, and '
        'shows the assistant working until it answers', (tester) async {
      final gate = _Gate();
      await pumpChat(tester, gate);

      await type(tester, '  Hello there  ');
      await tapSend(tester);

      expect(gate.asked.single.message, 'Hello there');
      expect(find.text('Hello there'), findsOneWidget);
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('chat-input')))
            .controller!
            .text,
        '',
      );
      expect(find.byKey(const Key('typing-indicator')), findsOneWidget);
      expect(find.text('Thinking…'), findsOneWidget);

      gate.answer('Hi! How can I help?');
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.byKey(const Key('typing-indicator')), findsNothing);
      expect(find.text('Hi! How can I help?'), findsOneWidget);
      expect(find.text('Trips & delivery help'), findsOneWidget);
    });

    testWidgets('send is off for an empty box and while waiting', (
      tester,
    ) async {
      final gate = _Gate();
      await pumpChat(tester, gate);
      IconButton send() =>
          tester.widget<IconButton>(find.byKey(const Key('chat-send')));

      expect(send().onPressed, isNull);
      await type(tester, '   ');
      expect(send().onPressed, isNull);

      await type(tester, 'one');
      expect(send().onPressed, isNotNull);
      await tapSend(tester);

      await type(tester, 'two');
      expect(send().onPressed, isNull); // still waiting for the first
      gate.answer('ok');
      await tester.pump(const Duration(milliseconds: 300));
      expect(send().onPressed, isNotNull);
    });

    testWidgets('follow-ups carry the conversation id', (tester) async {
      final gate = _Gate();
      await pumpChat(tester, gate);
      await type(tester, 'first');
      await tapSend(tester);
      gate.answer('one', id: 'conv-9');
      await tester.pump(const Duration(milliseconds: 300));

      await type(tester, 'second');
      await tapSend(tester);

      expect(gate.asked.first.conversationId, isNull);
      expect(gate.asked.last.conversationId, 'conv-9');
      gate.answer('two', id: 'conv-9');
      await tester.pump(const Duration(milliseconds: 300));
    });

    testWidgets('sources are collapsed under the answer and open on tap', (
      tester,
    ) async {
      await pumpChat(tester, MockAssistantRepository(latency: Duration.zero));
      await tester.tap(find.text('How do I report damaged goods?'));
      await tester.pumpAndSettle();

      expect(find.text('1 source'), findsOneWidget);
      expect(find.byKey(const Key('source-card')), findsNothing);

      await tester.tap(find.byKey(const Key('sources-toggle')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('source-card')), findsOneWidget);
      expect(find.text('1. Incident reporting policy · p. 2'), findsOneWidget);

      await tester.tap(find.byKey(const Key('sources-toggle')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('source-card')), findsNothing);
    });

    testWidgets('a failure shows in the chat and Try again re-asks it', (
      tester,
    ) async {
      final gate = _Gate();
      await pumpChat(tester, gate);
      await type(tester, 'what now');
      await tapSend(tester);
      gate.fail(
        const AssistantException('The assistant is unavailable right now.'),
      );
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.byKey(const Key('chat-error')), findsOneWidget);
      expect(
        find.text('The assistant is unavailable right now.'),
        findsOneWidget,
      );

      await tester.tap(find.byKey(const Key('chat-retry')));
      await tester.pump();
      expect(gate.asked.map((a) => a.message), ['what now', 'what now']);
      expect(
        find.byKey(const Key('chat-error')),
        findsNothing,
      ); // replaced by the wait
      gate.answer('Back now');
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Back now'), findsOneWidget);
      expect(find.text('what now'), findsOneWidget); // asked once on screen
    });

    testWidgets('when the assistant is not set up there is nothing to retry', (
      tester,
    ) async {
      final gate = _Gate();
      await pumpChat(tester, gate);
      await type(tester, 'hello');
      await tapSend(tester);
      gate.fail(
        const AssistantException(
          'The assistant is not set up on this server yet.',
          retryable: false,
        ),
      );
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.textContaining('not set up'), findsOneWidget);
      expect(find.byKey(const Key('chat-retry')), findsNothing);
    });

    testWidgets('offline: the box is off, suggestions are off, and the '
        'earlier chat stays readable', (tester) async {
      final store = MemoryLocalStore();
      await pumpChat(
        tester,
        MockAssistantRepository(latency: Duration.zero),
        store: store,
      );
      await tester.tap(find.text('Has my route changed?'));
      await tester.pumpAndSettle();

      ProviderScope.containerOf(tester.element(find.byType(ChatScreen)))
          .read(onlineProvider.notifier)
          .toggle(); // no signal
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('chat-offline')), findsOneWidget);
      expect(
        tester.widget<TextField>(find.byKey(const Key('chat-input'))).enabled,
        isFalse,
      );
      expect(find.textContaining('plan v3'), findsOneWidget); // still readable
    });

    testWidgets('New chat clears the conversation', (tester) async {
      await pumpChat(tester, MockAssistantRepository(latency: Duration.zero));
      await tester.tap(find.text("What's my next stop?"));
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('chat-new')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('chat-welcome')), findsOneWidget);
    });

    testWidgets('the back arrow leaves the chat', (tester) async {
      await pumpChat(tester, MockAssistantRepository(latency: Duration.zero));
      await tester.tap(find.byKey(const Key('chat-back')));
      await tester.pumpAndSettle();
      expect(find.text('Trips page'), findsOneWidget);
    });
  });

  group('the conversation', () {
    ProviderContainer container(
      AssistantRepository repo,
      MemoryLocalStore store, {
      List<Trip> trips = const [],
    }) {
      final c = ProviderContainer(
        overrides: baseOverrides(repo, store, trips: trips),
      );
      addTearDown(c.dispose);
      return c;
    }

    Future<void> settle() =>
        Future<void>.delayed(const Duration(milliseconds: 20));

    test('is kept per driver and comes back after a restart', () async {
      final store = MemoryLocalStore();
      final first = container(
        MockAssistantRepository(latency: Duration.zero),
        store,
      );
      await first.read(authControllerProvider.future);
      first.read(chatControllerProvider);
      await first
          .read(chatControllerProvider.notifier)
          .send("What's my next stop?");

      final restarted = container(
        MockAssistantRepository(latency: Duration.zero),
        store,
      );
      await restarted.read(authControllerProvider.future);
      restarted.read(chatControllerProvider);
      await settle();
      final state = restarted.read(chatControllerProvider);
      expect(state.messages.map((m) => m.role), [
        ChatRole.user,
        ChatRole.assistant,
      ]);
      expect(state.messages.first.text, "What's my next stop?");
      expect(state.conversationId, isNotNull);
    });

    test('keeps only the most recent messages', () async {
      final store = MemoryLocalStore();
      final c = container(
        MockAssistantRepository(latency: Duration.zero),
        store,
      );
      c.read(chatControllerProvider);
      for (var i = 0; i < 35; i++) {
        await c.read(chatControllerProvider.notifier).send('hello $i');
      }
      final restarted = container(
        MockAssistantRepository(latency: Duration.zero),
        store,
      );
      await restarted.read(authControllerProvider.future);
      restarted.read(chatControllerProvider);
      await settle();
      final messages = restarted.read(chatControllerProvider).messages;
      expect(messages.length, 60);
      expect(messages.last.role, ChatRole.assistant);
    });

    test('empty and whitespace questions are ignored; one at a time', () async {
      final gate = _Gate();
      final c = container(gate, MemoryLocalStore());
      final chat = c.read(chatControllerProvider.notifier);
      await chat.send('   ');
      expect(c.read(chatControllerProvider).messages, isEmpty);

      final pending = chat.send('first');
      await chat.send('second'); // ignored: still waiting
      expect(gate.asked, hasLength(1));
      gate.answer('done');
      await pending;
    });

    test(
      'asks about the trip that is under way, else the first unfinished',
      () async {
        final gate = _Gate();
        final done = Trip(
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          name: 'Trip A',
          subtitle: '',
          departure: DateTime(2026),
          status: TripStatus.completed,
          stops: const [],
        );
        final waiting = Trip(
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          name: 'Trip B',
          subtitle: '',
          departure: DateTime(2026),
          status: TripStatus.ready,
          stops: const [],
        );
        final moving = Trip(
          id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          name: 'Trip C',
          subtitle: '',
          departure: DateTime(2026),
          status: TripStatus.inProgress,
          stops: const [],
        );

        final c = container(
          gate,
          MemoryLocalStore(),
          trips: [done, waiting, moving],
        );
        await c.read(tripsProvider.future);
        final f = c.read(chatControllerProvider.notifier).send('where to');
        gate.answer('x');
        await f;
        expect(gate.asked.last.tripId, moving.id);

        final c2 = container(
          _Gate(),
          MemoryLocalStore(),
          trips: [done, waiting],
        );
        final gate2 = c2.read(assistantRepositoryProvider) as _Gate;
        await c2.read(tripsProvider.future);
        final f2 = c2.read(chatControllerProvider.notifier).send('where to');
        gate2.answer('x');
        await f2;
        expect(gate2.asked.last.tripId, waiting.id);

        final c3 = container(_Gate(), MemoryLocalStore(), trips: [done]);
        final gate3 = c3.read(assistantRepositoryProvider) as _Gate;
        await c3.read(tripsProvider.future);
        final f3 = c3.read(chatControllerProvider.notifier).send('where to');
        gate3.answer('x');
        await f3;
        expect(gate3.asked.last.tripId, isNull);
      },
    );

    test('an unexpected error still ends as a retryable bubble', () async {
      final repo = _Boom();
      final c = container(repo, MemoryLocalStore());
      await c.read(chatControllerProvider.notifier).send('hi');
      final last = c.read(chatControllerProvider).messages.last;
      expect(last.failed, isTrue);
      expect(last.text, contains('Something went wrong'));
      expect(c.read(chatControllerProvider).sending, isFalse);
    });

    test('editing the same driver\'s profile does not wipe the chat', () async {
      final c = container(
        MockAssistantRepository(latency: Duration.zero),
        MemoryLocalStore(),
      );
      await c.read(authControllerProvider.future);
      await c
          .read(authControllerProvider.notifier)
          .login(phone: '0770000002', password: 'secret1');
      c.read(chatControllerProvider);
      await c.read(chatControllerProvider.notifier).send('hello');
      expect(c.read(chatControllerProvider).messages, hasLength(2));

      final me = c.read(authControllerProvider).value!;
      c
          .read(authControllerProvider.notifier)
          .setDriver(
            Driver(id: me.id, name: 'New Name', code: me.code, depot: me.depot),
          );

      expect(c.read(chatControllerProvider).messages, hasLength(2));
    });

    test('a different driver signing in starts a fresh chat', () async {
      final c = container(
        MockAssistantRepository(latency: Duration.zero),
        MemoryLocalStore(),
      );
      await c.read(authControllerProvider.future);
      await c
          .read(authControllerProvider.notifier)
          .login(phone: '0770000002', password: 'secret1');
      c.read(chatControllerProvider);
      await c.read(chatControllerProvider.notifier).send('hello');

      final me = c.read(authControllerProvider).value!;
      c
          .read(authControllerProvider.notifier)
          .setDriver(
            Driver(
              id: 'someone-else',
              name: me.name,
              code: 'DRV-9',
              depot: me.depot,
            ),
          );

      expect(c.read(chatControllerProvider).isEmpty, isTrue);
    });

    test('New chat forgets the conversation, on screen and on disk', () async {
      final store = MemoryLocalStore();
      final c = container(
        MockAssistantRepository(latency: Duration.zero),
        store,
      );
      await c.read(authControllerProvider.future);
      c.read(chatControllerProvider);
      await c.read(chatControllerProvider.notifier).send('hello');
      await c.read(chatControllerProvider.notifier).newChat();
      expect(c.read(chatControllerProvider).isEmpty, isTrue);
      expect(c.read(chatControllerProvider).conversationId, isNull);

      final restarted = container(
        MockAssistantRepository(latency: Duration.zero),
        store,
      );
      await restarted.read(authControllerProvider.future);
      restarted.read(chatControllerProvider);
      await settle();
      expect(restarted.read(chatControllerProvider).isEmpty, isTrue);
    });

    test('a damaged saved chat is ignored', () async {
      final store = MemoryLocalStore();
      await store.write('c:chat', '{"messages": [{"nope": 1}]}');
      final c = container(
        MockAssistantRepository(latency: Duration.zero),
        store,
      );
      c.read(chatControllerProvider);
      await settle();
      expect(c.read(chatControllerProvider).isEmpty, isTrue);
    });
  });

  group('message text', () {
    Future<void> show(WidgetTester tester, String text) =>
        tester.pumpWidget(MaterialApp(home: Scaffold(body: MessageText(text))));

    testWidgets('bold, italic and bullets are formatted, not shown raw', (
      tester,
    ) async {
      await show(tester, 'Go to **Ja-Ela** *now*\n- first\n- second');
      expect(find.textContaining('**'), findsNothing);
      expect(find.textContaining('- first'), findsNothing);
      final rich = tester.widgetList<RichText>(find.byType(RichText)).toList();
      final text = rich.map((r) => r.text.toPlainText()).join('|');
      expect(text, contains('Go to Ja-Ela now'));
      expect(text, contains('first'));
      expect(text, contains('second'));
    });

    testWidgets('plain text is shown as typed', (tester) async {
      await show(tester, 'Just a sentence. 2 * 3 stays.');
      expect(find.textContaining('Just a sentence.'), findsOneWidget);
    });
  });
}

class _Boom implements AssistantRepository {
  @override
  Future<AssistantReply> ask({
    required String message,
    String? conversationId,
    String? tripId,
  }) async => throw const FormatException('bad payload');
}
