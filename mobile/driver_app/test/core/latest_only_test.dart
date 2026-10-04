import 'dart:async';

import 'package:driver_app/core/latest_only.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('runs the first job straight away', () async {
    final runner = LatestOnly();
    var ran = 0;
    runner.run(() async => ran++);
    await Future<void>.delayed(Duration.zero);
    expect(ran, 1);
  });

  test('while one job is in flight, only the newest queued job runs next',
      () async {
    final runner = LatestOnly();
    final gate = Completer<void>();
    final log = <String>[];

    runner.run(() async {
      log.add('first');
      await gate.future;
    });
    for (final name in ['second', 'third', 'fourth']) {
      runner.run(() async => log.add(name));
    }
    expect(log, ['first']); // the rest are waiting, not started

    gate.complete();
    await Future<void>.delayed(Duration.zero);
    await Future<void>.delayed(Duration.zero);
    expect(log, ['first', 'fourth']); // second and third were dropped
  });

  test('a failing job does not stop later jobs', () async {
    final runner = LatestOnly();
    var ran = 0;
    runner.run(() async => throw StateError('boom'));
    await Future<void>.delayed(Duration.zero);
    runner.run(() async => ran++);
    await Future<void>.delayed(Duration.zero);
    expect(ran, 1);
  });
}
