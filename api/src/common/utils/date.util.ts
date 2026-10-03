/** Today's date (YYYY-MM-DD) where Waypoint operates, whatever the server's clock zone. */
export const today = (): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' }).format(
    new Date(),
  );
