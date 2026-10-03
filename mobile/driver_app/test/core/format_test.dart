import 'package:driver_app/core/format.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('formats morning, noon, afternoon and midnight', () {
    expect(formatTime(DateTime(2026, 1, 1, 5, 30)), '05:30 AM');
    expect(formatTime(DateTime(2026, 1, 1, 12, 0)), '12:00 PM');
    expect(formatTime(DateTime(2026, 1, 1, 17, 20)), '05:20 PM');
    expect(formatTime(DateTime(2026, 1, 1, 0, 5)), '12:05 AM');
  });

  group('notification time', () {
    final now = DateTime(2026, 9, 29, 9, 0);

    test('same day: just now, minutes, hours', () {
      expect(formatNotificationTime(DateTime(2026, 9, 29, 8, 59, 30), now),
          'Just now');
      expect(formatNotificationTime(DateTime(2026, 9, 29, 8, 58), now),
          '2 min ago');
      expect(formatNotificationTime(DateTime(2026, 9, 29, 7, 0), now),
          '2 h ago');
      // A timestamp slightly in the future (clock skew) is not "-5 min ago".
      expect(formatNotificationTime(DateTime(2026, 9, 29, 9, 5), now),
          'Just now');
    });

    test('yesterday and older show the clock time', () {
      expect(formatNotificationTime(DateTime(2026, 9, 28, 17, 20), now),
          'Yesterday · 5:20 PM');
      expect(formatNotificationTime(DateTime(2026, 9, 28, 0, 5), now),
          'Yesterday · 12:05 AM');
      expect(formatNotificationTime(DateTime(2026, 9, 27, 17, 15), now),
          'Sep 27 · 5:15 PM');
    });

    test('a message from late yesterday is not "N min ago"', () {
      final justAfterMidnight = DateTime(2026, 9, 29, 0, 5);
      expect(formatNotificationTime(DateTime(2026, 9, 28, 23, 57),
              justAfterMidnight),
          'Yesterday · 11:57 PM');
    });

    test('dayLabel groups by calendar day', () {
      expect(dayLabel(DateTime(2026, 9, 29, 1), now), 'TODAY');
      expect(dayLabel(DateTime(2026, 9, 28, 23), now), 'YESTERDAY');
      expect(dayLabel(DateTime(2026, 9, 27), now), 'SEP 27');
    });
  });
}
