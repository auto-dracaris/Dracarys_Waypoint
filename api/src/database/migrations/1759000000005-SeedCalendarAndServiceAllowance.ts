import { MigrationInterface, QueryRunner } from 'typeorm';
import { readCsvRows } from '../seed-data.util';

// `calendar.csv` stops in mid-2026, but `orders.requested_date` references
// this table, so live orders need rows beyond it. Dates after the file's last
// row are generated up to this day.
const CALENDAR_HORIZON_END = '2027-12-31';

// Months flagged `monsoon = 1` throughout the supplied calendar.
const MONSOON_MONTHS = [3, 4, 5, 6, 10, 11];

const DAY_MS = 24 * 60 * 60 * 1000;

function isoWeekOf(date: Date): { isoYear: number; isoWeek: number } {
  // The ISO week belongs to the year of its Thursday.
  const thursday = new Date(date.getTime());
  thursday.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  return {
    isoYear: thursday.getUTCFullYear(),
    isoWeek: Math.ceil(((thursday.getTime() - yearStart) / DAY_MS + 1) / 7),
  };
}

export class SeedCalendarAndServiceAllowance1759000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const row of readCsvRows('service_allowance.csv')) {
      await queryRunner.query(
        `INSERT INTO service_allowance (brand, dock_type, service_allowance_min)
         VALUES ($1, $2, $3)
         ON CONFLICT (brand, dock_type) DO NOTHING;`,
        [row.brand, row.dock_type, parseInt(row.service_allowance_min, 10)],
      );
    }

    const insertDay = `INSERT INTO calendar (
        "date", dow, iso_year, iso_week, is_payday, festival, festival_ramp,
        is_holiday, monsoon, is_operating
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT ("date") DO NOTHING;`;

    const calendarRows = readCsvRows('calendar.csv');
    for (const row of calendarRows) {
      await queryRunner.query(insertDay, [
        row.date,
        parseInt(row.dow, 10),
        parseInt(row.iso_year, 10),
        parseInt(row.iso_week, 10),
        row.is_payday === '1',
        row.festival || null,
        parseFloat(row.festival_ramp),
        row.is_holiday === '1',
        row.monsoon === '1',
        row.is_operating === '1',
      ]);
    }

    // Generated rows carry only what follows from the date itself: the
    // weekday, the ISO week, the Monday–Saturday operating rule and the
    // monsoon months. Paydays, festivals and holidays cannot be derived, so
    // they stay unset.
    const lastSupplied = calendarRows[calendarRows.length - 1].date;
    const end = new Date(`${CALENDAR_HORIZON_END}T00:00:00Z`).getTime();
    for (
      let time = new Date(`${lastSupplied}T00:00:00Z`).getTime() + DAY_MS;
      time <= end;
      time += DAY_MS
    ) {
      const day = new Date(time);
      const dow = (day.getUTCDay() + 6) % 7; // 0 is Monday
      const { isoYear, isoWeek } = isoWeekOf(day);
      await queryRunner.query(insertDay, [
        day.toISOString().slice(0, 10),
        dow,
        isoYear,
        isoWeek,
        false,
        null,
        0,
        false,
        MONSOON_MONTHS.includes(day.getUTCMonth() + 1),
        dow !== 6,
      ]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM calendar;`);
    await queryRunner.query(`DELETE FROM service_allowance;`);
  }
}
