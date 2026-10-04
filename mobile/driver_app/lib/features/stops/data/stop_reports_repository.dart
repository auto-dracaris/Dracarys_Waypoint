import '../../../core/photos/photo_picker.dart';

/// Client-minted ids that make a retried submission land once: the API returns
/// the stored record for an id it has already seen.
class ProofIds {
  const ProofIds({
    required this.proof,
    required this.signature,
    required this.photo,
  });

  final String proof;
  final String signature;
  final String photo;
}

/// What the driver records at a stop besides the handover itself: who took the
/// goods (with a signature or photo), and delivery problems.
abstract interface class StopReportsRepository {
  Future<void> submitProof({
    required String tripId,
    required String stopId,
    required ProofIds ids,
    required String receivedBy,
    String? notes,
    List<int>? signaturePng,
    PickedPhoto? photo,
  });

  /// [photoId] is the client id for the photo's upload, so a retry reuses it.
  Future<void> reportIssue({
    required String tripId,
    required String clientId,
    required String orderId,
    required String type,
    required int affectedCases,
    String? note,
    PickedPhoto? photo,
    String? photoId,
  });
}
