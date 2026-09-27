import { DateTime } from 'luxon';
import { describe, expect, test } from 'vitest';

import { nthSunday, parseLocalDateTime } from '../src/time.js';

const zone = 'America/Chicago';

describe('parseLocalDateTime', () => {
  test('interprets a Hideout date and time in Central Time', () => {
    const retrievedAt = DateTime.fromISO('2026-09-27T12:00:00', { zone });

    const result = parseLocalDateTime(
      'Sat. September 26th',
      '7:30pm',
      retrievedAt,
    );

    expect(result.toISO()).toBe('2026-09-26T19:30:00.000-05:00');
  });

  test('uses the correct offsets across the spring daylight-saving boundary', () => {
    const retrievedAt = DateTime.fromISO('2026-03-01T12:00:00', { zone });

    const before = parseLocalDateTime('Sun. March 8th', '1:30am', retrievedAt);
    const after = parseLocalDateTime('Sun. March 8th', '3:30am', retrievedAt);

    expect(before.offset).toBe(-360);
    expect(after.offset).toBe(-300);
  });

  test('infers January as the next year when retrieved in late December', () => {
    const retrievedAt = DateTime.fromISO('2026-12-30T12:00:00', { zone });

    const result = parseLocalDateTime(
      'Sat. January 2nd',
      '7:30pm',
      retrievedAt,
    );

    expect(result.toISODate()).toBe('2027-01-02');
  });

  test('keeps late December in the current year near New Year', () => {
    const retrievedAt = DateTime.fromISO('2026-12-30T12:00:00', { zone });

    const result = parseLocalDateTime(
      'Mon. December 28th',
      '7:30pm',
      retrievedAt,
    );

    expect(result.toISODate()).toBe('2026-12-28');
  });

  test('rejects a nonexistent local daylight-saving time', () => {
    const retrievedAt = DateTime.fromISO('2026-03-01T12:00:00', { zone });

    expect(() =>
      parseLocalDateTime('Sun. March 8th', '2:30am', retrievedAt),
    ).toThrow(/invalid local time/i);
  });
});

describe('nthSunday', () => {
  test.each([
    [2026, 9, 1, '2026-09-06'],
    [2026, 9, 4, '2026-09-27'],
    [2026, 8, 5, '2026-08-30'],
  ])('returns Sunday %i-%i ordinal %i', (year, month, ordinal, expected) => {
    expect(nthSunday(year, month, ordinal)?.toISODate()).toBe(expected);
  });

  test('returns null when a month has no fifth Sunday', () => {
    expect(nthSunday(2026, 9, 5)).toBeNull();
  });
});
