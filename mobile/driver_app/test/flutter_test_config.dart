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
  await testMain();
}
