import 'dart:typed_data';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

/// A picture chosen or taken by the driver, ready to upload.
class PickedPhoto {
  const PickedPhoto({
    required this.bytes,
    required this.filename,
    this.contentType = 'image/jpeg',
  });

  final Uint8List bytes;
  final String filename;
  final String contentType;
}

enum PhotoSource { camera, gallery }

/// Takes or picks a photo. A seam for the platform plugin, so screens can be
/// tested without a camera.
abstract interface class PhotoPicker {
  /// Null when the driver backs out.
  Future<PickedPhoto?> pick(PhotoSource source);
}

/// The API accepts PNG or JPEG up to 5 MB; shrinking to 1280 px at JPEG 80
/// keeps a phone photo far below that.
class DevicePhotoPicker implements PhotoPicker {
  DevicePhotoPicker([ImagePicker? picker]) : _picker = picker ?? ImagePicker();

  final ImagePicker _picker;

  @override
  Future<PickedPhoto?> pick(PhotoSource source) async {
    final file = await _picker.pickImage(
      source: source == PhotoSource.camera
          ? ImageSource.camera
          : ImageSource.gallery,
      maxWidth: 1280,
      maxHeight: 1280,
      imageQuality: 80,
    );
    if (file == null) return null;
    final name = file.name.isEmpty ? 'photo.jpg' : file.name;
    return PickedPhoto(
      bytes: await file.readAsBytes(),
      filename: name,
      contentType: name.toLowerCase().endsWith('.png')
          ? 'image/png'
          : 'image/jpeg',
    );
  }
}

final photoPickerProvider = Provider<PhotoPicker>((_) => DevicePhotoPicker());
