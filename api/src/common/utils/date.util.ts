/** Today's date (YYYY-MM-DD) where Waypoint operates, whatever the server's clock zone. */
export const today = (): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' }).format(
    new Date(),
  );

/** The order cutoff, 16:00 in Colombo (+05:30, no DST), on `date` (YYYY-MM-DD). */
export const cutoffOn = (date: string): Date =>
  new Date(`${date}T16:00:00+05:30`);
