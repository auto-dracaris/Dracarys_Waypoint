import 'dart:convert';

import 'package:driver_app/core/photos/photo_picker.dart';

/// A 1x1 PNG, so `Image.memory` has something real to decode.
final tinyPng = base64Decode(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
);

class FakePhotoPicker implements PhotoPicker {
  FakePhotoPicker({this.photo});

  /// What the "camera" returns; null means the driver backed out.
  PickedPhoto? photo;
  final requested = <PhotoSource>[];

  @override
  Future<PickedPhoto?> pick(PhotoSource source) async {
    requested.add(source);
    return photo ??
        PickedPhoto(
          bytes: tinyPng,
          filename: 'test.png',
          contentType: 'image/png',
        );
  }
}
