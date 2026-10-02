import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Flat top-down map, or a tilted camera with 3D buildings.
enum MapMode { flat, tilted }

class MapModeNotifier extends Notifier<MapMode> {
  @override
  MapMode build() => MapMode.flat;

  void toggle() =>
      state = state == MapMode.flat ? MapMode.tilted : MapMode.flat;
}

final mapModeProvider = NotifierProvider.autoDispose<MapModeNotifier, MapMode>(
  MapModeNotifier.new,
);
