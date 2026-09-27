import { DateTime } from 'luxon';

const ZONE = 'America/Chicago';

interface ParsedDate {
  month: number;
  day: number;
  explicitYear?: number;
}

interface ParsedTime {
  hour: number;
  minute: number;
}

function parseDateParts(dateText: string): ParsedDate {
  const cleaned = dateText
    .replace(/^[A-Za-z]{3,9}\.?\s+/, '')
    .replace(/(\d)(st|nd|rd|th)\b/gi, '$1')
    .replace(/,/g, '')
    .trim();
  const match = cleaned.match(/^([A-Za-z]+)\s+(\d{1,2})(?:\s+(\d{4}))?$/);
  if (!match) {
    throw new Error(`Invalid date: ${dateText}`);
  }

  const monthName = match[1];
  const dayText = match[2];
  if (!monthName || !dayText) {
    throw new Error(`Invalid date: ${dateText}`);
  }

  const parsedMonth = DateTime.fromFormat(monthName, 'LLLL', {
    locale: 'en-US',
    zone: ZONE,
  });
  if (!parsedMonth.isValid) {
    throw new Error(`Invalid date: ${dateText}`);
  }

  const yearText = match[3];
  return {
    month: parsedMonth.month,
    day: Number(dayText),
    ...(yearText ? { explicitYear: Number(yearText) } : {}),
  };
}

function parseTimeParts(timeText: string): ParsedTime {
  const cleaned = timeText.toLowerCase().replace(/\s+/g, '');
  const twelveHour = cleaned.match(/^(\d{1,2}):(\d{2})(am|pm)$/);
  if (twelveHour) {
    const rawHour = Number(twelveHour[1]);
    const minute = Number(twelveHour[2]);
    const meridiem = twelveHour[3];
    if (rawHour < 1 || rawHour > 12 || minute > 59) {
      throw new Error(`Invalid time: ${timeText}`);
    }
    const hour = (rawHour % 12) + (meridiem === 'pm' ? 12 : 0);
    return { hour, minute };
  }

  const twentyFourHour = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourHour) {
    const hour = Number(twentyFourHour[1]);
    const minute = Number(twentyFourHour[2]);
    if (hour > 23 || minute > 59) {
      throw new Error(`Invalid time: ${timeText}`);
    }
    return { hour, minute };
  }

  throw new Error(`Invalid time: ${timeText}`);
}

function inferYear(month: number, day: number, retrievedAt: DateTime): number {
  const candidates = [
    retrievedAt.year - 1,
    retrievedAt.year,
    retrievedAt.year + 1,
  ]
    .map((year) => DateTime.fromObject({ year, month, day }, { zone: ZONE }))
    .filter((candidate) => candidate.isValid);

  const nearest = candidates.sort(
    (a, b) =>
      Math.abs(a.diff(retrievedAt.startOf('day'), 'days').days) -
      Math.abs(b.diff(retrievedAt.startOf('day'), 'days').days),
  )[0];
  if (!nearest) {
    throw new Error('Invalid date');
  }
  return nearest.year;
}

function sameWallTime(
  value: DateTime,
  expected: ParsedDate & ParsedTime,
): boolean {
  return (
    value.month === expected.month &&
    value.day === expected.day &&
    value.hour === expected.hour &&
    value.minute === expected.minute
  );
}

export function parseLocalDateTime(
  dateText: string,
  timeText: string,
  retrievedAt: DateTime,
): DateTime {
  const date = parseDateParts(dateText);
  const time = parseTimeParts(timeText);
  const year =
    date.explicitYear ?? inferYear(date.month, date.day, retrievedAt);
  const expected = { ...date, ...time };
  const value = DateTime.fromObject(
    { year, month: date.month, day: date.day, ...time },
    { zone: ZONE },
  );

  if (!value.isValid || !sameWallTime(value, expected)) {
    throw new Error(`Invalid local time: ${dateText} ${timeText}`);
  }

  const adjacent = [value.minus({ hours: 1 }), value.plus({ hours: 1 })];
  if (
    adjacent.some(
      (candidate) =>
        sameWallTime(candidate, expected) && candidate.offset !== value.offset,
    )
  ) {
    throw new Error(`Ambiguous local time: ${dateText} ${timeText}`);
  }

  return value;
}

export function nthSunday(
  year: number,
  month: number,
  ordinal: number,
): DateTime | null {
  if (!Number.isInteger(ordinal) || ordinal < 1 || ordinal > 5) {
    throw new Error(`Invalid Sunday ordinal: ${ordinal}`);
  }
  const first = DateTime.fromObject({ year, month, day: 1 }, { zone: ZONE });
  if (!first.isValid) {
    throw new Error(`Invalid year or month: ${year}-${month}`);
  }
  const daysUntilSunday = (7 - first.weekday) % 7;
  const result = first.plus({ days: daysUntilSunday + (ordinal - 1) * 7 });
  return result.month === month ? result : null;
}
