import 'dart:async';
import 'dart:io';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

/// Loads the app's bundled fonts so widget tests lay text out with real glyph
/// widths instead of the wide placeholder font.
Future<void> testExecutable(FutureOr<void> Function() testMain) async {
  TestWidgetsFlutterBinding.ensureInitialized();
  const fonts = {
    'GoogleSansFlex': 'assets/fonts/GoogleSansFlex.ttf',
    'Inter': 'assets/fonts/Inter.ttf',
    'Outfit': 'assets/fonts/Outfit.ttf',
  };
  for (final entry in fonts.entries) {
    final bytes = File(entry.value).readAsBytesSync();
    final loader = FontLoader(entry.key)
      ..addFont(Future.value(ByteData.sublistView(bytes)));
    await loader.load();
  }
  // Looping animations (the Trip Copilot dots) would keep `pumpAndSettle` from
  // ever finishing, so tests run as if the system's "remove animations" setting
  // were on. The mark honours it; tests of the animation itself opt back in.
  setUp(() {
    final binding = TestWidgetsFlutterBinding.instance;
    binding.platformDispatcher.accessibilityFeaturesTestValue =
        const FakeAccessibilityFeatures(disableAnimations: true);
  });
  await testMain();
}
