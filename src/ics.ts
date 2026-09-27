import { createHash } from 'node:crypto';

import type { DateTime } from 'luxon';

import type { CalendarEvent } from './model.js';

export interface SourceSignals {
  showMarkupDetected: boolean;
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function foldLine(value: string): string[] {
  const lines: string[] = [];
  let current = '';
  for (const character of value) {
    const candidate = current + character;
    if (Buffer.byteLength(candidate, 'utf8') > 75) {
      lines.push(current);
      current = ` ${character}`;
    } else {
      current = candidate;
    }
  }
  lines.push(current);
  return lines;
}

function utcStamp(value: DateTime): string {
  if (!value.isValid) throw new Error('Cannot render an invalid date');
  return value.toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'");
}

function eventEnd(event: CalendarEvent): DateTime {
  if (event.end) return event.end;
  if (event.durationMinutes) {
    return event.start.plus({ minutes: event.durationMinutes });
  }
  throw new Error(`Event ${event.title} has no end or duration`);
}

function eventUid(event: CalendarEvent): string {
  return `${createHash('sha256').update(event.identitySeed).digest('hex')}@hideout-comedy-calendar`;
}

function eventDescription(event: CalendarEvent): string {
  return [
    event.description,
    event.price ? `Price: ${event.price}` : '',
    event.ticketUrl ? `Tickets / sign-up: ${event.ticketUrl}` : '',
    `Source: ${event.sourceUrl}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function validateEvents(
  events: CalendarEvent[],
  sourceSignals: SourceSignals,
): void {
  if (
    sourceSignals.showMarkupDetected &&
    events.filter(({ kind }) => kind === 'show').length === 0
  ) {
    throw new Error('Refusing to publish zero shows from show event markup');
  }

  const identities = new Set<string>();
  for (const event of events) {
    if (!event.title.trim()) throw new Error('Event title is empty');
    if (!event.start.isValid) {
      throw new Error(`Event ${event.title} has an invalid start`);
    }
    const end = eventEnd(event);
    if (!end.isValid || end <= event.start) {
      throw new Error(`Event ${event.title} has an invalid end`);
    }
    if (identities.has(event.identitySeed)) {
      throw new Error(`Duplicate event identity: ${event.identitySeed}`);
    }
    identities.add(event.identitySeed);
    const source = new URL(event.sourceUrl);
    if (source.protocol !== 'https:') {
      throw new Error(`Event ${event.title} has a non-HTTPS source URL`);
    }
    if (event.ticketUrl) {
      const ticket = new URL(event.ticketUrl);
      if (ticket.protocol !== 'https:') {
        throw new Error(`Event ${event.title} has a non-HTTPS ticket URL`);
      }
    }
  }
}

export function renderCalendar(
  events: CalendarEvent[],
  generatedAt: DateTime,
): string {
  const sorted = [...events].sort(
    (a, b) =>
      a.start.toMillis() - b.start.toMillis() ||
      a.title.localeCompare(b.title) ||
      a.identitySeed.localeCompare(b.identitySeed),
  );
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'PRODID:-//Hideout Comedy Calendar//EN',
    'X-WR-CALNAME:Hideout Comedy',
    'X-WR-TIMEZONE:America/Chicago',
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
    'X-PUBLISHED-TTL:PT6H',
  ];

  for (const event of sorted) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${eventUid(event)}`,
      `DTSTAMP:${utcStamp(generatedAt)}`,
      `LAST-MODIFIED:${utcStamp(generatedAt)}`,
      `DTSTART:${utcStamp(event.start)}`,
      `DTEND:${utcStamp(eventEnd(event))}`,
      `SUMMARY:${escapeText(event.title)}`,
      `DESCRIPTION:${escapeText(eventDescription(event))}`,
      `LOCATION:${escapeText(event.location)}`,
      `URL;VALUE=URI:${event.ticketUrl ?? event.sourceUrl}`,
      'STATUS:CONFIRMED',
      'TRANSP:TRANSPARENT',
      'SEQUENCE:0',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');

  return `${lines.flatMap(foldLine).join('\r\n')}\r\n`;
}
