import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'core/demo_mode.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // The demo-data switch survives restarts, so a developer testing with demo
  // data does not have to flip it again every launch.
  final saved = await DemoModeStore().read();
  runApp(ProviderScope(
    overrides: [
      if (saved != null) initialDemoModeProvider.overrideWithValue(saved),
    ],
    child: const WaypointDriverApp(),
  ));
}
