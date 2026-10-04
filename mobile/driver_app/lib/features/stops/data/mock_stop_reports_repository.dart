import '../../../core/photos/photo_picker.dart';
import 'stop_reports_repository.dart';

class MockStopReportsRepository implements StopReportsRepository {
  MockStopReportsRepository({this.latency = const Duration(milliseconds: 200)});

  final Duration latency;

  @override
  Future<void> submitProof({
    required String tripId,
    required String stopId,
    required ProofIds ids,
    required String receivedBy,
    String? notes,
    List<int>? signaturePng,
    PickedPhoto? photo,
  }) => Future<void>.delayed(latency);

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
  }) => Future<void>.delayed(latency);
}
