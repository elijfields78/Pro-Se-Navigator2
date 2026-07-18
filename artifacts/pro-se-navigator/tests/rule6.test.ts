import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeRule6Deadline,
  formatDeadlineDate,
  parseUserDate,
} from '../lib/rule6';

// All expected values below were computed by hand from the 2026/2027 calendar
// and the Rule 6(a) text: exclude the trigger day, count every calendar day,
// and if the last day is a weekend or federal holiday, roll forward to the
// next countable day.

test('plain weekday landing: no roll-forward', () => {
  // Mon 2026-03-02 + 14 days → Mon 2026-03-16 (ordinary weekday)
  assert.equal(computeRule6Deadline(new Date(2026, 2, 2), 14), '2026-03-16');
});

test('weekend then holiday: Saturday rolls over MLK Day to Tuesday', () => {
  // Fri 2026-01-09 + 8 → Sat Jan 17 → Sun 18 → Mon Jan 19 is MLK Day
  // (3rd Monday of Jan 2026) → Tue Jan 20
  assert.equal(computeRule6Deadline(new Date(2026, 0, 9), 8), '2026-01-20');
});

test('observed holiday: July 4 2026 is a Saturday, observed Friday July 3', () => {
  // Fri 2026-06-12 + 21 → Fri Jul 3 (observed Independence Day) → Sat 4 →
  // Sun 5 → Mon Jul 6
  assert.equal(computeRule6Deadline(new Date(2026, 5, 12), 21), '2026-07-06');
});

test('fixed holiday on a weekday: Christmas Friday rolls to Monday', () => {
  // Fri 2026-12-04 + 21 → Fri Dec 25 (Christmas) → Sat 26 → Sun 27 → Mon Dec 28
  assert.equal(computeRule6Deadline(new Date(2026, 11, 4), 21), '2026-12-28');
});

test('year boundary: lands on New Year\'s Day of the NEXT year', () => {
  // Tue 2026-12-22 + 10 → Fri 2027-01-01 (New Year's Day 2027) → Sat 2 →
  // Sun 3 → Mon Jan 4 2027. Exercises the year+1 holiday set.
  assert.equal(computeRule6Deadline(new Date(2026, 11, 22), 10), '2027-01-04');
});

test('lands ON Thanksgiving: rolls only one day (Friday is countable)', () => {
  // Thu 2026-11-05 + 21 → Thu Nov 26 (Thanksgiving, 4th Thursday) →
  // Fri Nov 27 is not a federal holiday → Fri 2026-11-27
  assert.equal(computeRule6Deadline(new Date(2026, 10, 5), 21), '2026-11-27');
});

test('trigger day itself is excluded from the count', () => {
  // 1-day period from Wed 2026-03-04 must land Thu 2026-03-05, not Wed.
  assert.equal(computeRule6Deadline(new Date(2026, 2, 4), 1), '2026-03-05');
});

test('formatDeadlineDate renders in local time without UTC shift', () => {
  assert.equal(formatDeadlineDate('2026-07-06'), 'Monday, July 6, 2026');
});

test('parseUserDate accepts MM/DD/YYYY and M/D/YYYY', () => {
  const a = parseUserDate('07/15/2025');
  assert.equal(a?.getFullYear(), 2025);
  assert.equal(a?.getMonth(), 6);
  assert.equal(a?.getDate(), 15);

  const b = parseUserDate('7/4/2026');
  assert.equal(b?.getMonth(), 6);
  assert.equal(b?.getDate(), 4);
});

test('parseUserDate accepts ISO YYYY-MM-DD', () => {
  const d = parseUserDate('2026-01-09');
  assert.equal(d?.getFullYear(), 2026);
  assert.equal(d?.getMonth(), 0);
  assert.equal(d?.getDate(), 9);
});

test('parseUserDate rejects impossible and malformed dates', () => {
  assert.equal(parseUserDate('02/30/2025'), null); // Feb 30 doesn't exist
  assert.equal(parseUserDate('13/01/2025'), null); // month 13
  assert.equal(parseUserDate('2026-1-9'), null);   // ISO requires zero-padding
  assert.equal(parseUserDate('July 4 2026'), null);
  assert.equal(parseUserDate(''), null);
});
