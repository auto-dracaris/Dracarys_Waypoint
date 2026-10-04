import '../../../core/api/api_client.dart';
import '../../../core/api/api_exception.dart';
import '../domain/location_point.dart';

/// How a send ended.
enum UploadStatus {
  /// Everything in the batch is dealt with.
  ok,

  /// Not now: no signal, the server could not queue the batch (`503`), or the
  /// session needs refreshing. The points stay and the same batch goes again.
  retryLater,

  /// `403`/`404`: this driver is not (or no longer) the driver of that vehicle,
  /// so the assignment has probably changed. The points stay; the profile
  /// should be fetched again.
  vehicleRejected,
}

class UploadResult {
  const UploadResult(this.status, this.finished);

  final UploadStatus status;

  /// Ids that can leave the phone: accepted by the server (`202`), or single
  /// points the server called invalid (`400`), which will never be accepted.
  final List<String> finished;
}

/// Sends batches to `POST /vehicles/:id/locations`.
///
/// What the API says about each outcome decides what happens to the points:
/// only a `202` makes them safe to delete; a `400` means the body was invalid
/// and sending it unchanged will fail again, so the bad point is found by
/// splitting the batch; every other failure keeps the points to send again.
class LocationUploader {
  LocationUploader(this._api);

  final ApiClient _api;

  /// The API takes 1 to 500 points per request.
  static const maxBatch = 500;

  Future<UploadResult> upload(int vehicleId, List<LocationPoint> points) async {
    if (points.isEmpty) return const UploadResult(UploadStatus.ok, []);
    try {
      await _api.post(
        '/vehicles/$vehicleId/locations',
        body: {
          'points': [for (final p in points) p.toApi()],
        },
      );
      return UploadResult(UploadStatus.ok, [for (final p in points) p.id]);
    } on ApiException catch (e) {
      switch (e.statusCode) {
        case 400:
          return _splitInvalid(vehicleId, points);
        case 403:
        case 404:
          return const UploadResult(UploadStatus.vehicleRejected, []);
        default:
          // No signal (0), 401 that a refresh could not fix, 503, 5xx...
          return const UploadResult(UploadStatus.retryLater, []);
      }
    }
  }

  /// The server refused the batch as invalid but not which point is at fault.
  /// A single refused point is dropped; a bigger batch is halved, so good points
  /// still get through and the bad one is isolated in a few rounds.
  Future<UploadResult> _splitInvalid(
    int vehicleId,
    List<LocationPoint> points,
  ) async {
    if (points.length == 1) {
      return UploadResult(UploadStatus.ok, [points.single.id]);
    }
    final mid = points.length ~/ 2;
    final first = await upload(vehicleId, points.sublist(0, mid));
    if (first.status != UploadStatus.ok) return first;
    final second = await upload(vehicleId, points.sublist(mid));
    return UploadResult(second.status, [...first.finished, ...second.finished]);
  }
}
