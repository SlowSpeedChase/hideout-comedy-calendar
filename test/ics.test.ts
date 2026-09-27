import { DateTime } from 'luxon';
import { describe, expect, test } from 'vitest';

import { renderCalendar, validateEvents } from '../src/ics.js';
import type { CalendarEvent } from '../src/model.js';

const generatedAt = DateTime.fromISO('2026-09-27T16:00:00Z');
const unfold = (ics: string): string => ics.replace(/\r\n[ \t]/g, '');

function event(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    kind: 'show',
    title: 'A Show',
    start: DateTime.fromISO('2026-10-02T19:30:00', {
      zone: 'America/Chicago',
    }),
    durationMinutes: 90,
    location: 'Hideout Annex',
    description: 'A description',
    sourceUrl: 'https://hideouttheatre.com/shows/One?event_id=1',
    identitySeed: 'show:one',
    ...overrides,
  };
}

describe('renderCalendar', () => {
  test('renders deterministic start-time ordering with UTC timestamps', () => {
    const later = event({
      title: 'Later',
      start: DateTime.fromISO('2026-10-03T21:30:00', {
        zone: 'America/Chicago',
      }),
      identitySeed: 'show:later',
    });
    const earlier = event({ title: 'Earlier' });

    const ics = renderCalendar([later, earlier], generatedAt);

    expect(ics.indexOf('SUMMARY:Earlier')).toBeLessThan(
      ics.indexOf('SUMMARY:Later'),
    );
    expect(ics).toContain('DTSTART:20261003T003000Z');
    expect(ics).toContain('DTEND:20261003T020000Z');
    expect(ics).toContain('DTSTAMP:20260927T160000Z');
  });

  test('uses stable SHA-256 UIDs derived from event identity', () => {
    const first = renderCalendar([event()], generatedAt);
    const second = renderCalendar([event()], generatedAt.plus({ hours: 1 }));

    const expected =
      'UID:fbed5b9266dc86d4d0464d5b1e2cebdbdebe76313a738768c92ed995e89e4b96@hideout-comedy-calendar';
    expect(unfold(first)).toContain(expected);
    expect(unfold(second)).toContain(expected);
  });

  test('emits CRLF, six-hour refresh metadata, and no alarms', () => {
    const ics = renderCalendar([event()], generatedAt);

    expect(ics).toContain('REFRESH-INTERVAL;VALUE=DURATION:PT6H\r\n');
    expect(ics).toContain('X-PUBLISHED-TTL:PT6H\r\n');
    expect(ics.replaceAll('\r\n', '')).not.toContain('\n');
    expect(ics).not.toContain('VALARM');
  });

  test('escapes text and folds every content line at 75 UTF-8 octets', () => {
    const ics = renderCalendar(
      [
        event({
          title: 'Comma, Semi; Slash\\ Line\nTwo',
          description: `Crowd 🎭 ${'é'.repeat(80)}`,
        }),
      ],
      generatedAt,
    );

    expect(ics).toContain('SUMMARY:Comma\\, Semi\\; Slash\\\\ Line\\nTwo');
    for (const line of ics.split('\r\n').filter(Boolean)) {
      expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75);
    }
  });

  test('includes price, ticket link, source link, and transparent status', () => {
    const ics = renderCalendar(
      [
        event({
          price: '$12 – $20',
          ticketUrl: 'https://hideouttheatre.com/tickets/1',
        }),
      ],
      generatedAt,
    );

    const unfolded = unfold(ics);
    expect(unfolded).toContain('Price: $12 – $20');
    expect(unfolded).toContain(
      'Tickets / sign-up: https://hideouttheatre.com/tickets/1',
    );
    expect(unfolded).toContain('Source: https://hideouttheatre.com/shows/One?');
    expect(ics).toContain('STATUS:CONFIRMED');
    expect(ics).toContain('TRANSP:TRANSPARENT');
  });
});

describe('validateEvents', () => {
  test('rejects duplicate event identities', () => {
    expect(() =>
      validateEvents([event(), event()], { showMarkupDetected: true }),
    ).toThrow(/duplicate/i);
  });

  test('rejects invalid event dates', () => {
    expect(() =>
      validateEvents([event({ start: DateTime.invalid('bad date') })], {
        showMarkupDetected: true,
      }),
    ).toThrow(/invalid start/i);
  });

  test('rejects zero shows when the source contained show markup', () => {
    expect(() => validateEvents([], { showMarkupDetected: true })).toThrow(
      /zero shows/i,
    );
  });
});
