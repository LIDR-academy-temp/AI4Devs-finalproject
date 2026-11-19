import type { Formats } from "next-intl";

// Date and number formats by language (FR-38). The language decides the order
// and names: the same "short" date is 18/10/2026 in Spanish and 10/18/2026 in
// English (DESIGN.md, Content Constraints).

export const formats = {
  dateTime: {
    short: { day: "numeric", month: "numeric", year: "numeric" },
    long: { day: "numeric", month: "long", year: "numeric" },
  },
  number: {
    integer: { maximumFractionDigits: 0 },
  },
} satisfies Formats;

/**
 * The time zone dates are formatted in. Calendar dates are UTC midnights (see
 * `calendarDate`), so they show the same day everywhere; no screen shows a
 * time of day yet (design decision 8 of the T-05 change).
 */
export const TIME_ZONE = "UTC";

/**
 * A calendar date from a Postgres `date` column (`YYYY-MM-DD`), such as a ship
 * date, as the UTC midnight of that day, so formatting it in `TIME_ZONE` shows
 * the same day in every browser.
 */
export function calendarDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new RangeError(`Not a calendar date: ${value}`);
  const [, year, month, day] = match.map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!));
}
