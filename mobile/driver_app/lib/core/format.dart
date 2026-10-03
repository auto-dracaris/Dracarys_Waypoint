const _months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', //
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/// Zero-padded 12-hour time: `05:30 AM`.
String formatTime(DateTime t) {
  final hour = t.hour % 12 == 0 ? 12 : t.hour % 12;
  final minute = t.minute.toString().padLeft(2, '0');
  final period = t.hour < 12 ? 'AM' : 'PM';
  return '${hour.toString().padLeft(2, '0')}:$minute $period';
}

/// 24-hour `HH:mm`: `07:10`.
String formatHm(DateTime t) =>
    '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

/// Compact 12-hour clock without a leading zero: `5:20 PM`.
String _clock(DateTime t) => formatTime(t).replaceFirst(RegExp(r'^0'), '');

/// Whole calendar days from [t] to [now] (0 = same day, 1 = yesterday).
int _daysAgo(DateTime t, DateTime now) => DateTime.utc(now.year, now.month, now.day)
    .difference(DateTime.utc(t.year, t.month, t.day))
    .inDays;

/// Relative time for notifications: `2 min ago` today, `Yesterday · 5:20 PM`,
/// then `Sep 27 · 5:15 PM`. Anything not in the past reads `Just now`.
String formatNotificationTime(DateTime t, DateTime now) {
  final days = _daysAgo(t, now);
  if (days <= 0) {
    final minutes = now.difference(t).inMinutes;
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return '$minutes min ago';
    return '${minutes ~/ 60} h ago';
  }
  if (days == 1) return 'Yesterday · ${_clock(t)}';
  return '${_months[t.month - 1]} ${t.day} · ${_clock(t)}';
}

/// Section heading for a day in the feed: `TODAY`, `YESTERDAY`, `SEP 27`.
String dayLabel(DateTime t, DateTime now) {
  final days = _daysAgo(t, now);
  if (days <= 0) return 'TODAY';
  if (days == 1) return 'YESTERDAY';
  return '${_months[t.month - 1]} ${t.day}'.toUpperCase();
}
