/** Today's date (YYYY-MM-DD) where Waypoint operates, whatever the server's clock zone. */
export const today = (): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' }).format(
    new Date(),
  );

/** The order cutoff, 16:00 in Colombo (+05:30, no DST), on `date` (YYYY-MM-DD). */
export const cutoffOn = (date: string): Date =>
  new Date(`${date}T16:00:00+05:30`);

/** `HH:MM` (or `HH:MM:SS`) as minutes from midnight. */
export const toMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

/** Minutes from midnight on `date`, as an instant in Colombo. */
export const atMinute = (date: string, minutes: number): Date =>
  new Date(new Date(`${date}T00:00:00+05:30`).getTime() + minutes * 60_000);

/** An instant as minutes from midnight in Colombo. */
export const minuteOfDay = (instant: Date): number => {
  const local = new Date(instant.getTime() + 330 * 60_000);
  return local.getUTCHours() * 60 + local.getUTCMinutes();
};
