/**
 * Federal Rule of Civil Procedure 6(a) — Period Computation
 *
 * Rule 6(a)(1): When computing any period of time:
 *   - Exclude the day of the event that triggers the period
 *   - Count every calendar day (including intermediate Saturdays, Sundays,
 *     and legal holidays)
 *   - Include the last day of the period — BUT if the last day is a Saturday,
 *     Sunday, or legal holiday, the period runs until the end of the next day
 *     that is not a Saturday, Sunday, or legal holiday
 *
 * Rule 6(a)(6): "Legal holiday" means:
 *   New Year's Day, Martin Luther King Jr. Day, Washington's Birthday
 *   (Presidents Day), Memorial Day, Juneteenth National Independence Day,
 *   Independence Day, Labor Day, Columbus Day, Veterans Day, Thanksgiving Day,
 *   Christmas Day, and any other day declared a holiday by the President or
 *   Congress.
 */

// ── Federal holiday calculation ───────────────────────────────────────────────

/** Return the Nth occurrence of a weekday (0=Sun … 6=Sat) in a given month/year. */
function nthWeekday(year: number, month: number, dow: number, n: number): Date {
  const d = new Date(year, month, 1);
  let count = 0;
  while (true) {
    if (d.getDay() === dow) {
      count++;
      if (count === n) return new Date(d);
    }
    d.setDate(d.getDate() + 1);
  }
}

/** Return the last occurrence of a weekday in a given month/year. */
function lastWeekday(year: number, month: number, dow: number): Date {
  const d = new Date(year, month + 1, 0); // last day of month
  while (d.getDay() !== dow) d.setDate(d.getDate() - 1);
  return new Date(d);
}

/**
 * If a fixed-date holiday falls on Saturday, observe Friday.
 * If it falls on Sunday, observe Monday.
 */
function observed(date: Date): Date {
  const dow = date.getDay();
  const d = new Date(date);
  if (dow === 6) d.setDate(d.getDate() - 1); // Saturday → Friday
  if (dow === 0) d.setDate(d.getDate() + 1); // Sunday → Monday
  return d;
}

/** Build a Set of federal holiday keys ("YYYY-M-D") for a given year. */
function buildHolidaySet(year: number): Set<string> {
  const holidays: Date[] = [
    observed(new Date(year, 0, 1)),    // New Year's Day
    nthWeekday(year, 0, 1, 3),         // MLK Day — 3rd Monday in January
    nthWeekday(year, 1, 1, 3),         // Presidents Day — 3rd Monday in February
    lastWeekday(year, 4, 1),           // Memorial Day — last Monday in May
    observed(new Date(year, 5, 19)),   // Juneteenth — June 19
    observed(new Date(year, 6, 4)),    // Independence Day — July 4
    nthWeekday(year, 8, 1, 1),         // Labor Day — 1st Monday in September
    nthWeekday(year, 9, 1, 2),         // Columbus Day — 2nd Monday in October
    observed(new Date(year, 10, 11)),  // Veterans Day — November 11
    nthWeekday(year, 10, 4, 4),        // Thanksgiving — 4th Thursday in November
    observed(new Date(year, 11, 25)),  // Christmas Day — December 25
  ];
  return new Set(holidays.map(dateKey));
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function isWeekend(d: Date): boolean {
  const dow = d.getDay();
  return dow === 0 || dow === 6;
}

function isFederalHoliday(d: Date, holidays: Set<string>): boolean {
  return holidays.has(dateKey(d));
}

function isCountableDay(d: Date, holidays: Set<string>): boolean {
  return !isWeekend(d) && !isFederalHoliday(d, holidays);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Compute the deadline date per Federal Rule 6(a).
 *
 * @param triggerDate  The event date (day 0; excluded from counting).
 * @param days         The number of days in the period (e.g. 21 for FRCP 12(a)).
 * @returns            ISO date string "YYYY-MM-DD" for the deadline.
 */
export function computeRule6Deadline(triggerDate: Date, days: number): string {
  // Step 1: Add the period
  const d = new Date(triggerDate);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);

  // Build holiday sets for the affected years (may span a year boundary)
  const holidays = new Set<string>([
    ...buildHolidaySet(d.getFullYear()),
    ...buildHolidaySet(d.getFullYear() + 1),
  ]);

  // Step 2: Roll forward if the last day is a weekend or holiday
  while (!isCountableDay(d, holidays)) {
    d.setDate(d.getDate() + 1);
  }

  // Return YYYY-MM-DD
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Format a YYYY-MM-DD date string for human display.
 * e.g. "Monday, August 4, 2025"
 */
export function formatDeadlineDate(isoDate: string): string {
  const [yyyy, mm, dd] = isoDate.split('-').map(Number);
  // Construct in local time (no UTC offset shift)
  const d = new Date(yyyy, mm - 1, dd);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
  });
}

/**
 * Parse a user-entered date string into a Date object.
 * Accepts:
 *   - "MM/DD/YYYY"   (common US format)
 *   - "M/D/YYYY"     (without zero-padding)
 *   - "YYYY-MM-DD"   (ISO format)
 *
 * Returns null if the input is not a valid date.
 */
export function parseUserDate(input: string): Date | null {
  const s = input.trim();

  // MM/DD/YYYY or M/D/YYYY
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const [, m, d, y] = mdy.map(Number);
    const date = new Date(y, m - 1, d);
    if (
      !isNaN(date.getTime()) &&
      date.getFullYear() === y &&
      date.getMonth() === m - 1 &&
      date.getDate() === d
    ) return date;
  }

  // YYYY-MM-DD
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const [, y, m, d] = iso.map(Number);
    const date = new Date(y, m - 1, d);
    if (
      !isNaN(date.getTime()) &&
      date.getFullYear() === y &&
      date.getMonth() === m - 1 &&
      date.getDate() === d
    ) return date;
  }

  return null;
}
