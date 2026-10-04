// Plays the whole Colombo demo trip on its own, at a pace fit for a screen
// recording: sign in, the trip list, the loaded trip started, four stops with
// directions in 2D and 3D, a short delivery reported as an issue, proof of
// delivery with the OTP, then the Updates tab.
//
// Run (emulator or phone, with internet for the map):
//   ./tool/app.ps1 -Mode demo -Action test -Device <device>
// (the same as flutter test with --dart-define-from-file=config/demo.json)
import 'package:driver_app/main.dart' as app;
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

/// Lets the app run for [seconds] of real time, so animations play out.
Future<void> hold(WidgetTester t, double seconds) async {
  final end = DateTime.now().add(Duration(milliseconds: (seconds * 1000).round()));
  while (DateTime.now().isBefore(end)) {
    await t.pump(const Duration(milliseconds: 100));
  }
}

/// Waits (up to [timeout]) until [finder] matches something.
Future<void> waitFor(
  WidgetTester t,
  Finder finder, {
  Duration timeout = const Duration(seconds: 40),
}) async {
  final end = DateTime.now().add(timeout);
  while (finder.evaluate().isEmpty) {
    if (DateTime.now().isAfter(end)) {
      throw TestFailure('Timed out waiting for $finder');
    }
    await t.pump(const Duration(milliseconds: 200));
  }
}

Future<void> tap(WidgetTester t, Finder finder, {double after = 1.5}) async {
  await waitFor(t, finder);
  try {
    await t.ensureVisible(finder.first);
  } catch (_) {}
  await hold(t, 0.4);
  await t.tap(finder.first);
  await hold(t, after);
}

Finder text(String s) => find.text(s);
Finder key(String k) => find.byKey(Key(k));

Future<void> signAndName(WidgetTester t, String name) async {
  await waitFor(t, key('staff-name'));
  await t.enterText(key('staff-name'), name);
  await hold(t, 1);
  await t.ensureVisible(key('otp-input'));
  await hold(t, 0.4);
  // The store reads out the code it was texted.
  await t.enterText(key('otp-input'), '482913');
  await hold(t, 1.5);
  await tap(t, key('otp-verify'), after: 1.5);
}

/// Starts navigation from the directions screen and waits for arrival.
Future<void> drive(WidgetTester t, {bool showModes = false}) async {
  await tap(t, text('Get Directions'), after: 3);
  await waitFor(t, text('Start navigation'));
  await hold(t, 3); // the whole route on the map
  if (showModes) {
    await tap(t, key('map-mode-toggle'), after: 5); // 3D buildings
  }
  await tap(t, text('Start navigation'), after: 6);
  if (showModes) {
    await hold(t, 8);
    await tap(t, key('map-mode-toggle'), after: 7); // back to 2D, heading up
    await tap(t, key('map-mode-toggle'), after: 6); // and 3D again
  }
  await waitFor(
    t,
    text("I've arrived"),
    timeout: const Duration(minutes: 4),
  );
  await hold(t, 2);
  await tap(t, text("I've arrived"), after: 3);
}

Future<void> deliver(WidgetTester t, String who) async {
  await tap(t, text('Continue to proof of delivery'), after: 2);
  await signAndName(t, who);
  await tap(t, text('Complete stop'), after: 3);
}

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  binding.framePolicy = LiveTestWidgetsFlutterBindingFramePolicy.fullyLive;

  testWidgets('Colombo demo trip', (t) async {
    app.main();

    // ── Sign in ────────────────────────────────────────────────────────────
    await waitFor(t, key('phone'), timeout: const Duration(seconds: 60));
    await hold(t, 2);
    await t.enterText(key('phone'), '0771234567');
    await hold(t, 1);
    await t.enterText(key('password'), 'password1');
    await hold(t, 1.5);
    await tap(t, key('login-submit'), after: 3);

    // ── My trips: Trip 1 is loaded, Trip 2 is still loading ──────────────
    await waitFor(t, text('View trip'));
    await hold(t, 5);
    await tap(t, text('View trip'), after: 4);

    // ── Start the trip ────────────────────────────────────────────────────
    await tap(t, text('Ready to depart'), after: 4);
    await waitFor(t, text('NEXT STOP · 1 OF 4'));
    await hold(t, 3);

    // ── Stop 1: directions in 2D and 3D, deliver ──────────────────────────
    await drive(t, showModes: true);
    await hold(t, 2);
    await deliver(t, 'Kumara');

    // ── Stop 2: a short delivery, reported as an issue ────────────────────
    await waitFor(t, text('NEXT STOP · 2 OF 4'));
    await hold(t, 3);
    await drive(t);
    await hold(t, 2);
    final card = find.byKey(const Key('order-card-ORD-5011'));
    await waitFor(t, card);
    for (var i = 0; i < 4; i++) {
      await t.tap(
        find.descendant(of: card, matching: key('stepper-minus')).first,
      );
      await hold(t, 0.6);
    }
    await hold(t, 2);
    await tap(t, text('Report the shortfall'), after: 3);
    await tap(t, text('Save and report issue'), after: 4);
    await deliver(t, 'Perera');

    // ── Stop 3: mark arrived straight from the stop screen ────────────────
    await waitFor(t, text('NEXT STOP · 3 OF 4'));
    await hold(t, 3);
    await tap(t, text('Mark arrived'), after: 3);
    await deliver(t, 'Fernando');

    // ── Stop 4: last drop, the trip completes ─────────────────────────────
    await waitFor(t, text('NEXT STOP · 4 OF 4'));
    await hold(t, 2);
    await drive(t);
    await hold(t, 2);
    await deliver(t, 'Silva');
    await waitFor(t, text('My trips'));
    await hold(t, 5);

    // ── Updates tab ───────────────────────────────────────────────────────
    await tap(t, text('Updates'), after: 6);
  });
}
