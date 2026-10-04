import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'core/demo_mode.dart';
import 'firebase_options.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // The demo-data switch survives restarts, so a developer testing with demo
  // data does not have to flip it again every launch.
  try {
    await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  } catch (_) {
    // No Firebase (an unsupported platform): the app works, without push.
  }
  final saved = await DemoModeStore().read();
  runApp(ProviderScope(
    overrides: [
      if (saved != null) initialDemoModeProvider.overrideWithValue(saved),
    ],
    child: const WaypointDriverApp(),
  ));
}
