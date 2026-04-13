/**
 * Parses event datetimes from the API.
 *
 * - Values with `Z` or a numeric offset (`±HH:mm` / `±HHmm`) are absolute instants (UTC / zoned).
 * - **Naive** `YYYY-MM-DDTHH:mm[:ss][.fff]` (no zone) are treated as wall clock in
 *   `EVENT_START_LOCAL_OFFSET` (default `+05:30`, India). Matches Postman/curl where
 *   `2026-04-13T22:30:00` means 10:30 PM IST, not UTC.
 *
 * To send a true UTC instant, always include `Z` or an explicit offset.
 */
export function parseApiDateTime(raw: string): Date {
  const s = String(raw).trim();
  if (!s) {
    throw new Error('INVALID_DATETIME');
  }
  const hasZ = /Z$/i.test(s);
  const hasOffset = /[+-]\d{2}:?\d{2}$/.test(s);
  if (hasZ || hasOffset) {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) {
      throw new Error('INVALID_DATETIME');
    }
    return d;
  }
  const offset = process.env.EVENT_START_LOCAL_OFFSET?.trim() || '+05:30';
  const d = new Date(`${s}${offset}`);
  if (Number.isNaN(d.getTime())) {
    throw new Error('INVALID_DATETIME');
  }
  return d;
}
