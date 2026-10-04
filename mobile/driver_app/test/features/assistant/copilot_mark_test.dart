import 'package:driver_app/features/assistant/presentation/widgets/copilot_mark.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('the dot cluster', () {
    const mid = CopilotDotsPainter.grid ~/ 2;

    test('is brightest at its heart and fades toward the edge', () {
      final centre = CopilotDotsPainter.brightness(mid, mid, 0.25);
      final near = CopilotDotsPainter.brightness(mid + 2, mid, 0.25);
      final far = CopilotDotsPainter.brightness(mid + 3, mid, 0.25);
      expect(centre, greaterThan(near));
      expect(near, greaterThan(far));
      // Beyond its reach nothing is lit.
      expect(CopilotDotsPainter.brightness(0, 0, 0.25), 0);
      expect(
        CopilotDotsPainter.brightness(
          CopilotDotsPainter.grid - 1,
          CopilotDotsPainter.grid - 1,
          0.25,
        ),
        0,
      );
    });

    test('pulses on and off over a cycle, never going fully dark', () {
      final seen = [
        for (var i = 0; i <= 20; i++)
          CopilotDotsPainter.brightness(mid, mid, i / 20),
      ];
      final lo = seen.reduce((a, b) => a < b ? a : b);
      final hi = seen.reduce((a, b) => a > b ? a : b);
      expect(hi, greaterThan(lo * 2)); // clearly on versus off
      expect(lo, greaterThan(0)); // the heart never vanishes
      expect(hi, lessThanOrEqualTo(1));
    });

    test('the wave travels: neighbours peak at different moments', () {
      double peakAt(int c, int r) {
        var best = 0.0, at = 0.0;
        for (var i = 0; i < 100; i++) {
          final b = CopilotDotsPainter.brightness(c, r, i / 100);
          if (b > best) {
            best = b;
            at = i / 100;
          }
        }
        return at;
      }

      expect(peakAt(mid, mid), isNot(peakAt(mid + 2, mid + 2)));
    });
  });

  group('the mark', () {
    Future<void> pumpMark(
      WidgetTester tester, {
      bool animate = true,
      bool disableAnimations = false,
    }) {
      return tester.pumpWidget(
        MaterialApp(
          home: MediaQuery(
            data: MediaQueryData(disableAnimations: disableAnimations),
            child: Scaffold(
              body: Center(child: CopilotMark(size: 60, animate: animate)),
            ),
          ),
        ),
      );
    }

    testWidgets('animates: frames change over time', (tester) async {
      await pumpMark(tester);
      await tester.pump(const Duration(milliseconds: 300));
      expect(tester.binding.hasScheduledFrame, isTrue);
      await tester.pump(const Duration(milliseconds: 700));
      // Still going: it is a loop, not a one-off.
      expect(tester.binding.hasScheduledFrame, isTrue);
    });

    testWidgets('can be held still', (tester) async {
      await pumpMark(tester, animate: false);
      await tester.pump(const Duration(milliseconds: 300));
      expect(tester.binding.hasScheduledFrame, isFalse);
    });

    testWidgets('starts and stops as animate is toggled', (tester) async {
      await pumpMark(tester, animate: false);
      await tester.pump(const Duration(milliseconds: 100));
      expect(tester.binding.hasScheduledFrame, isFalse);
      await pumpMark(tester, animate: true);
      await tester.pump(const Duration(milliseconds: 100));
      expect(tester.binding.hasScheduledFrame, isTrue);
      await pumpMark(tester, animate: false);
      await tester.pump(const Duration(milliseconds: 100));
      await tester.pump(const Duration(milliseconds: 100));
      expect(tester.binding.hasScheduledFrame, isFalse);
    });

    testWidgets('stands still when the system asks to reduce motion', (
      tester,
    ) async {
      await pumpMark(tester, disableAnimations: true);
      await tester.pump(const Duration(milliseconds: 300));
      expect(tester.binding.hasScheduledFrame, isFalse);
    });

    testWidgets('is a circle of the requested size', (tester) async {
      await pumpMark(tester, animate: false);
      expect(tester.getSize(find.byType(CopilotMark)), const Size(60, 60));
      expect(find.byType(ClipOval), findsOneWidget);
    });
  });

  group('the button', () {
    testWidgets('is the mark in a cream pill with the name, and taps', (
      tester,
    ) async {
      var taps = 0;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Align(
              alignment: Alignment.bottomRight,
              child: CopilotButton(onTap: () => taps++),
            ),
          ),
        ),
      );

      expect(find.text('Trip Copilot'), findsOneWidget);
      expect(find.byType(CopilotMark), findsOneWidget);
      final size = tester.getSize(find.byKey(const Key('chat-button')));
      expect(size.height, CopilotButton.height);
      expect(size.width, greaterThan(size.height * 2)); // a pill, not a circle

      await tester.tap(find.byKey(const Key('chat-button')));
      expect(taps, 1);
    });
  });
}
