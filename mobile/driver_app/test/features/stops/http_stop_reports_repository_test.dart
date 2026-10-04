import 'dart:convert';

import 'package:driver_app/core/photos/photo_picker.dart';
import 'package:driver_app/features/stops/data/http_stop_reports_repository.dart';
import 'package:driver_app/features/stops/data/stop_reports_repository.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import '../../support/offline_harness.dart';

({HttpStopReportsRepository repo, List<http.Request> sent}) build() {
  var imageCount = 0;
  final h = OfflineHarness((req) {
    if (req.url.path.endsWith('/images')) {
      return envelope(201, 'Image uploaded successfully', {
        'id': 'image-${++imageCount}',
        'url': 'https://img/x.png',
      });
    }
    return envelope(201, 'saved', {'id': 'saved'});
  });
  return (
    repo: HttpStopReportsRepository(
      h.submitter,
      now: () => DateTime.utc(2026, 10, 4, 3, 0),
    ),
    sent: h.sent,
  );
}

final photo = PickedPhoto(
  bytes: utf8.encode('jpegbytes'),
  filename: 'evidence.jpg',
  contentType: 'image/jpeg',
);

const ids = ProofIds(
  proof: '00000000-0000-4000-8000-000000000001',
  signature: '00000000-0000-4000-8000-000000000002',
  photo: '00000000-0000-4000-8000-000000000003',
);

void main() {
  test(
    'a signature is uploaded as a proof_signature image, then named by id',
    () async {
      final t = build();
      await t.repo.submitProof(
        tripId: 'trip-1',
        stopId: '41',
        ids: ids,
        receivedBy: 'Kumara',
        notes: ' left at the dock ',
        signaturePng: utf8.encode('pngbytes'),
      );

      final upload = t.sent.first;
      expect(upload.url.path, '/api/images');
      expect(upload.headers['content-type'], startsWith('multipart/form-data'));
      expect(upload.body, contains('name="purpose"'));
      expect(upload.body, contains('proof_signature'));
      expect(upload.body, contains(ids.signature));
      expect(upload.body, contains('name="image"'));
      expect(upload.headers['Authorization'], 'Bearer A1');

      final proof = t.sent.last;
      expect(proof.url.path, '/api/trips/trip-1/stops/41/proof');
      final body = jsonDecode(proof.body) as Map<String, dynamic>;
      expect(body['clientId'], ids.proof);
      expect(body['receivedBy'], 'Kumara');
      expect(body['notes'], 'left at the dock');
      expect(body['signatureImageId'], 'image-1');
      expect(body.containsKey('photoImageId'), isFalse);
    },
  );

  test('a photo proof uploads as proof_photo', () async {
    final t = build();
    await t.repo.submitProof(
      tripId: 'trip-1',
      stopId: '41',
      ids: ids,
      receivedBy: 'Kumara',
      photo: photo,
    );

    expect(t.sent.first.body, contains('proof_photo'));
    final body = jsonDecode(t.sent.last.body) as Map<String, dynamic>;
    expect(body['photoImageId'], 'image-1');
    expect(body.containsKey('signatureImageId'), isFalse);
    expect(body.containsKey('notes'), isFalse);
  });

  test('an issue names the order, the cases and the uploaded photo', () async {
    final t = build();
    await t.repo.reportIssue(
      tripId: 'trip-1',
      clientId: ids.proof,
      orderId: 'ORD0000012',
      type: issueTypeDamaged,
      affectedCases: 3,
      note: 'crushed in transit',
      photo: photo,
      photoId: ids.photo,
    );

    expect(t.sent.first.body, contains('issue_photo'));
    final post = t.sent.last;
    expect(post.url.path, '/api/issues');
    final body = jsonDecode(post.body) as Map<String, dynamic>;
    expect(body, {
      'clientId': ids.proof,
      'type': 'damaged',
      'tripId': 'trip-1',
      'orderId': 'ORD0000012',
      'affectedCases': 3,
      'note': 'crushed in transit',
      'recordedAt': '2026-10-04T03:00:00.000Z',
      'photoImageId': 'image-1',
    });
  });

  test('an issue without a photo uploads nothing', () async {
    final t = build();
    await t.repo.reportIssue(
      tripId: 'trip-1',
      clientId: ids.proof,
      orderId: 'ORD0000012',
      type: issueTypeOther,
      affectedCases: 1,
    );
    expect(t.sent, hasLength(1));
    expect(t.sent.single.url.path, '/api/issues');
  });
}
