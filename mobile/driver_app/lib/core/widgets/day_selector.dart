import 'package:flutter/material.dart';

import '../format.dart';
import '../theme/app_colors.dart';
import '../theme/app_text.dart';

/// Steps through delivery days, or jumps to one with the calendar. Trips are
/// listed per day by the API, so this is how a driver looks at yesterday's
/// finished runs or tomorrow's plan.
class DaySelector extends StatelessWidget {
  const DaySelector({
    super.key,
    required this.day,
    required this.today,
    required this.onChanged,
    this.span = 60,
  });

  final DateTime day;
  final DateTime today;
  final ValueChanged<DateTime> onChanged;

  /// How many days either side of today the calendar offers.
  final int span;

  Future<void> _pick(BuildContext context) async {
    final base = DateTime(today.year, today.month, today.day);
    final picked = await showDatePicker(
      context: context,
      initialDate: day,
      firstDate: base.subtract(Duration(days: span)),
      lastDate: base.add(Duration(days: span)),
    );
    if (picked != null) onChanged(picked);
  }

  @override
  Widget build(BuildContext context) {
    DateTime shifted(int by) => DateTime(day.year, day.month, day.day + by);

    return Container(
      color: AppColors.surface,
      padding: const EdgeInsets.fromLTRB(8, 0, 8, 10),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.card,
          border: Border.all(color: AppColors.border),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            IconButton(
              key: const Key('day-prev'),
              tooltip: 'Previous day',
              icon: const Icon(Icons.chevron_left_rounded),
              onPressed: () => onChanged(shifted(-1)),
            ),
            Expanded(
              child: InkWell(
                key: const Key('day-pick'),
                borderRadius: BorderRadius.circular(8),
                onTap: () => _pick(context),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        Icons.calendar_today_rounded,
                        size: 16,
                        color: AppColors.inkSecondary,
                      ),
                      const SizedBox(width: 8),
                      Flexible(
                        child: Text(
                          formatDay(day, today),
                          key: const Key('day-label'),
                          overflow: TextOverflow.ellipsis,
                          style: AppText.textSmSemibold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            IconButton(
              key: const Key('day-next'),
              tooltip: 'Next day',
              icon: const Icon(Icons.chevron_right_rounded),
              onPressed: () => onChanged(shifted(1)),
            ),
          ],
        ),
      ),
    );
  }
}
