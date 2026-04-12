/**
 * Add whole calendar months in local time (handles month-length edge cases, e.g. Jan 31 + 1 → Feb end).
 */
export const addCalendarMonths = (from: Date, months: number): Date => {
  const d = new Date(from.getTime());
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() !== day) {
    d.setDate(0);
  }
  return d;
};
