import 'package:driver_app/core/format.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('formats morning, noon, afternoon and midnight', () {
    expect(formatTime(DateTime(2026, 1, 1, 5, 30)), '05:30 AM');
    expect(formatTime(DateTime(2026, 1, 1, 12, 0)), '12:00 PM');
    expect(formatTime(DateTime(2026, 1, 1, 17, 20)), '05:20 PM');
    expect(formatTime(DateTime(2026, 1, 1, 0, 5)), '12:05 AM');
  });
}
