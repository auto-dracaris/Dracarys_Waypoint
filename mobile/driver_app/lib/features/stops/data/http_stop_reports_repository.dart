import '../../../core/photos/photo_picker.dart';
import '../../../core/uuid.dart';
import '../../sync/data/action_submitter.dart';
import '../../sync/domain/pending_action.dart';
import 'stop_reports_repository.dart';

/// Issue types as the API names them (`IssueType` for drivers).
const issueTypeDamaged = 'damaged';
const issueTypeTemperature = 'temperature_breach';
const issueTypeShort = 'short_delivery';
const issueTypeWrongItems = 'wrong_items';
const issueTypeOther = 'other';

/// Proof of delivery and issue reports. Both go through the
/// [ActionSubmitter]: sent when there is a connection, kept on the phone with
/// their photos until there is one.
class HttpStopReportsRepository implements StopReportsRepository {
  HttpStopReportsRepository(this._submitter, {DateTime Function()? now})
    : _now = now ?? DateTime.now;

  final ActionSubmitter _submitter;
  final DateTime Function() _now;

  @override
  Future<void> submitProof({
    required String tripId,
    required String stopId,
    required ProofIds ids,
    required String receivedBy,
    String? notes,
    List<int>? signaturePng,
    PickedPhoto? photo,
  }) async {
    await _submitter.submit(
      kind: ActionKind.proof,
      tripId: tripId,
      stopId: stopId,
      body: {
        'ids': {
          'proof': ids.proof,
          'signature': ids.signature,
          'photo': ids.photo,
        },
        'receivedBy': receivedBy,
        'notes': notes,
      },
      blobs: {
        if (signaturePng != null)
          'signature': BlobData(
            bytes: signaturePng,
            filename: 'signature.png',
            contentType: 'image/png',
          ),
        if (photo != null)
          'photo': BlobData(
            bytes: photo.bytes,
            filename: photo.filename,
            contentType: photo.contentType,
          ),
      },
    );
  }

  @override
  Future<void> reportIssue({
    required String tripId,
    required String clientId,
    required String orderId,
    required String type,
    required int affectedCases,
    String? note,
    PickedPhoto? photo,
    String? photoId,
  }) async {
    await _submitter.submit(
      kind: ActionKind.issue,
      tripId: tripId,
      body: {
        'clientId': clientId,
        'type': type,
        'orderId': orderId,
        'affectedCases': affectedCases,
        'note': note,
        'photoId': photoId ?? newUuid(),
        // The handset clock: an issue noted offline is reported when it
        // happened, not when it was sent.
        'recordedAt': _now().toUtc().toIso8601String(),
      },
      blobs: {
        if (photo != null)
          'photo': BlobData(
            bytes: photo.bytes,
            filename: photo.filename,
            contentType: photo.contentType,
          ),
      },
    );
  }
}
