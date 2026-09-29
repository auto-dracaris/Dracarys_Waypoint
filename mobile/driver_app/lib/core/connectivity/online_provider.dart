import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Whether the app considers itself online. Mock-only for now: it flips on a
/// long-press of the status pill so the offline state can be demoed. Replace
/// the notifier body with a real connectivity listener when the API lands.
class OnlineNotifier extends Notifier<bool> {
  @override
  bool build() => true;

  void toggle() => state = !state;
}

final onlineProvider =
    NotifierProvider<OnlineNotifier, bool>(OnlineNotifier.new);
