import '../../../core/api/api_client.dart';
import '../../../core/storage/local_store.dart';
import '../domain/pending_action.dart';

/// Sends one action to the API. This is the only place that knows which call
/// each [ActionKind] makes, whether it is sent at once or hours later from the
/// queue. Every call carries the action's own client ids, so running one again
/// (the first attempt may have got through before the signal dropped) is safe.
class ActionExecutor {
  ActionExecutor(this._api, this._store);

  final ApiClient _api;
  final LocalStore _store;

  Future<void> run(PendingAction a) async {
    switch (a.kind) {
      case ActionKind.arrive:
        await _api.post(
          '/trips/${a.tripId}/stops/${a.stopId}/arrive',
          body: a.body,
        );
      case ActionKind.complete:
        await _api.post(
          '/trips/${a.tripId}/stops/${a.stopId}/complete',
          body: a.body,
        );
      case ActionKind.ackRoute:
        await _api.post(
          '/trips/${a.tripId}/route-change/acknowledge',
          body: a.body,
        );
      case ActionKind.proof:
        await _proof(a);
      case ActionKind.issue:
        await _issue(a);
    }
  }

  Future<String> _upload(
    PendingAction a,
    String key,
    String purpose,
    String clientId,
  ) async {
    final ref = a.blobs[key]!;
    final bytes = await _store.readBytes(ref.name);
    if (bytes == null) {
      throw StateError(
        'The ${key == 'signature' ? 'signature' : 'photo'} '
        'saved on this device could not be found',
      );
    }
    final data = await _api.upload(
      '/images',
      file: Upload(
        field: 'image',
        bytes: bytes,
        filename: ref.filename,
        contentType: ref.contentType,
      ),
      fields: {'purpose': purpose, 'clientId': clientId},
    ) as Map<String, dynamic>;
    return data['id'] as String;
  }

  Future<void> _proof(PendingAction a) async {
    final ids = Map<String, String>.from(a.body['ids'] as Map);
    String? signatureId, photoId;
    if (a.blobs.containsKey('signature')) {
      signatureId = await _upload(
        a,
        'signature',
        'proof_signature',
        ids['signature']!,
      );
    }
    if (a.blobs.containsKey('photo')) {
      photoId = await _upload(a, 'photo', 'proof_photo', ids['photo']!);
    }
    final notes = (a.body['notes'] as String?)?.trim() ?? '';
    await _api.post(
      '/trips/${a.tripId}/stops/${a.stopId}/proof',
      body: {
        'clientId': ids['proof'],
        'receivedBy': a.body['receivedBy'],
        if (notes.isNotEmpty) 'notes': notes,
        'signatureImageId': ?signatureId,
        'photoImageId': ?photoId,
      },
    );
  }

  Future<void> _issue(PendingAction a) async {
    String? photoId;
    if (a.blobs.containsKey('photo')) {
      photoId = await _upload(
        a,
        'photo',
        'issue_photo',
        (a.body['photoId'] as String?) ?? a.id,
      );
    }
    final note = (a.body['note'] as String?)?.trim() ?? '';
    await _api.post(
      '/issues',
      body: {
        'clientId': a.body['clientId'],
        'type': a.body['type'],
        'tripId': a.tripId,
        'orderId': a.body['orderId'],
        'affectedCases': a.body['affectedCases'],
        if (note.isNotEmpty) 'note': note,
        'photoImageId': ?photoId,
        if (a.body['recordedAt'] != null) 'recordedAt': a.body['recordedAt'],
      },
    );
  }
}
