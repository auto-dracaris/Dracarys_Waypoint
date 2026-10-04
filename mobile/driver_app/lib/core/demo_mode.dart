import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';

import '../features/auth/presentation/auth_controller.dart';
import 'api/api_config.dart';

/// Remembers the demo-data switch between launches. Kept apart from the
/// offline cache on purpose: signing in as another driver wipes that cache,
/// and this is a developer setting, not a driver's data.
class DemoModeStore {
  Future<File> _file() async => File(
      '${(await getApplicationSupportDirectory()).path}/demo_mode.flag');

  Future<bool?> read() async {
    try {
      final f = await _file();
      if (!await f.exists()) return null;
      return (await f.readAsString()).trim() == '1';
    } catch (_) {
      return null;
    }
  }

  Future<void> write(bool on) async {
    try {
      await (await _file()).writeAsString(on ? '1' : '0');
    } catch (_) {}
  }
}

/// What the app starts in: set from main() after reading [DemoModeStore],
/// otherwise the `--dart-define=USE_MOCKS` build default.
final initialDemoModeProvider = Provider<bool>((_) => useMocks);

/// Whether the app runs on built-in demo data instead of the server. Flipping
/// it swaps every repository at once and sends the app back to sign-in (demo
/// data has its own session; the real session is untouched and comes back
/// when switching back).
class DemoModeNotifier extends Notifier<bool> {
  @override
  bool build() => ref.watch(initialDemoModeProvider);

  void set(bool on) {
    if (state == on) return;
    state = on;
    DemoModeStore().write(on);
    ref.invalidate(authControllerProvider);
  }
}

final demoModeProvider =
    NotifierProvider<DemoModeNotifier, bool>(DemoModeNotifier.new);
