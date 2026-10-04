import '../../../core/api/api_exception.dart';
import '../../../core/storage/local_store.dart';
import '../../../core/uuid.dart';
import '../domain/pending_action.dart';
import 'action_executor.dart';
import 'action_queue.dart';

/// A file that goes with an action.
class BlobData {
  const BlobData({
    required this.bytes,
    required this.filename,
    required this.contentType,
  });

  final List<int> bytes;
  final String filename;
  final String contentType;
}

enum SubmitOutcome {
  /// The server has it.
  sent,

  /// Saved on the phone; it will be sent when the connection allows.
  queued,
}

/// Where every driver action goes. With a connection it is sent straight away,
/// so a refusal (wrong code, the stops were reordered) reaches the driver at
/// once. Without one it is saved to the queue and the driver carries on.
///
/// Actions for a trip are never allowed to overtake each other: if the trip
/// already has something waiting, the new action joins the queue behind it,
/// even when the connection is back.
class ActionSubmitter {
  ActionSubmitter({
    required this.queue,
    required this._executor,
    required this._store,
    required this._isOnline,
    this.onQueued,
    DateTime Function()? now,
  }) : _now = now ?? DateTime.now;

  final ActionQueue queue;
  final ActionExecutor _executor;
  final LocalStore _store;
  final bool Function() _isOnline;
  final DateTime Function() _now;

  /// Called after an action is queued, to start a sync attempt.
  final void Function()? onQueued;

  Future<SubmitOutcome> submit({
    required ActionKind kind,
    required String tripId,
    String? stopId,
    required Map<String, Object?> body,
    Map<String, Object?> meta = const {},
    Map<String, BlobData> blobs = const {},
  }) async {
    final id = newUuid();
    final refs = <String, BlobRef>{};
    for (final e in blobs.entries) {
      final ref = BlobRef(
        name: '$id-${e.key}',
        filename: e.value.filename,
        contentType: e.value.contentType,
      );
      await _store.writeBytes(ref.name, e.value.bytes);
      refs[e.key] = ref;
    }
    final action = PendingAction(
      id: id,
      kind: kind,
      tripId: tripId,
      stopId: stopId,
      createdAt: _now(),
      body: body,
      meta: meta,
      blobs: refs,
    );

    Future<void> dropBlobs() async {
      for (final ref in refs.values) {
        await _store.deleteBytes(ref.name);
      }
    }

    if (_isOnline() && !await queue.hasPendingFor(tripId)) {
      try {
        await _executor.run(action);
        await dropBlobs();
        return SubmitOutcome.sent;
      } on ApiException catch (e) {
        if (!e.isNetwork) {
          await dropBlobs();
          rethrow;
        }
        // The signal went while sending: fall through and keep it.
      } catch (_) {
        await dropBlobs();
        rethrow;
      }
    }
    await queue.add(action);
    onQueued?.call();
    return SubmitOutcome.queued;
  }
}
