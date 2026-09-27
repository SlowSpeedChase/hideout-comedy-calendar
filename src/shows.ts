import { load, type Cheerio } from 'cheerio';
import type { AnyNode } from 'domhandler';
import { DateTime } from 'luxon';

import type { CalendarEvent, SourceSnapshot } from './model.js';
import { parseLocalDateTime } from './time.js';

const ZONE = 'America/Chicago';
const HIDEOUT_ADDRESS = '5555 N Lamar Blvd B103, Austin, TX 78751';

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function eventDateLines(element: Cheerio<AnyNode>): string[] {
  const html = element.html() ?? '';
  const marker = '|||HIDEOUT_LINE|||';
  const withLines = html.replace(/<br\s*\/?\s*>/gi, marker);
  return load(`<div>${withLines}</div>`)('div')
    .text()
    .split(marker)
    .map(normalize)
    .filter(Boolean);
}

function parseDisplayStart(
  display: string,
  snapshot: SourceSnapshot,
): DateTime {
  const match = display.match(
    /^((?:[A-Za-z]{3,9}\.?\s+)?[A-Za-z]{3,9}\s+\d{1,2}(?:st|nd|rd|th)?(?:\s+\d{4})?),\s*(\d{1,2}:\d{2}\s*(?:am|pm))$/i,
  );
  if (!match?.[1] || !match[2]) {
    throw new Error(`Could not parse show date: ${display}`);
  }
  try {
    return parseLocalDateTime(match[1], match[2], snapshot.retrievedAt);
  } catch (error) {
    throw new Error(`Could not parse show date: ${display}`, { cause: error });
  }
}

function parseMachineDateTime(value: string): DateTime {
  const hasExplicitZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  if (hasExplicitZone) {
    const instant = DateTime.fromISO(value, { setZone: true }).setZone(ZONE);
    if (!instant.isValid) {
      throw new Error(`Could not parse machine-readable show date: ${value}`);
    }
    return instant;
  }

  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/,
  );
  if (!match) {
    throw new Error(`Could not parse machine-readable show date: ${value}`);
  }
  const expected = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6] ?? '0'),
  };
  const parsed = DateTime.fromObject(expected, { zone: ZONE });
  if (!parsed.isValid) {
    throw new Error(`Could not parse machine-readable show date: ${value}`);
  }
  const matchesWallTime = (candidate: DateTime): boolean =>
    candidate.year === expected.year &&
    candidate.month === expected.month &&
    candidate.day === expected.day &&
    candidate.hour === expected.hour &&
    candidate.minute === expected.minute &&
    candidate.second === expected.second;
  if (!matchesWallTime(parsed)) {
    throw new Error(`Could not parse machine-readable show date: ${value}`);
  }
  if (
    [parsed.minus({ hours: 1 }), parsed.plus({ hours: 1 })].some(
      (candidate) =>
        matchesWallTime(candidate) && candidate.offset !== parsed.offset,
    )
  ) {
    throw new Error(`Ambiguous machine-readable show date: ${value}`);
  }
  return parsed;
}

function locationFor(venue: string): string {
  if (!venue) return '';
  return /^Hideout Annex\b/i.test(venue)
    ? `${venue}, ${HIDEOUT_ADDRESS}`
    : venue;
}

export function parseShows(snapshot: SourceSnapshot): CalendarEvent[] {
  const $ = load(snapshot.html);
  const eventLinks = $('.event_notes > a').toArray();
  if (eventLinks.length === 0) {
    throw new Error('Show calendar contains no recognizable show events');
  }
  return eventLinks.map((node) => {
    const link = $(node);
    const title = normalize(link.find('.event_name').first().text());
    const href = link.attr('href');
    if (!title || !href) {
      throw new Error('Show is missing a title or source URL');
    }

    const lines = eventDateLines(link.find('.event_date').first());
    const machineTimes = link.find('time[datetime]').toArray();
    const machineStart = $(machineTimes[0]).attr('datetime');
    const machineEnd = $(machineTimes[1]).attr('datetime');
    const displayStart = lines[0];
    const start = machineStart
      ? parseMachineDateTime(machineStart)
      : displayStart
        ? parseDisplayStart(displayStart, snapshot)
        : (() => {
            throw new Error(`Could not parse show date for ${title}`);
          })();
    const venue = lines[1] ?? '';
    const price = lines[2];
    const end = machineEnd ? parseMachineDateTime(machineEnd) : undefined;
    if (end && end <= start) {
      throw new Error(`Show end must follow its start: ${title}`);
    }
    const eventUrl = new URL(href, snapshot.url).toString();
    const body = link
      .find('p:not(.read_more)')
      .toArray()
      .map((paragraph) => normalize($(paragraph).text()))
      .filter(Boolean)
      .join('\n\n');
    const description = [body, end ? '' : 'End time is estimated.']
      .filter(Boolean)
      .join('\n\n');

    return {
      kind: 'show',
      title,
      start,
      ...(end ? { end } : { durationMinutes: 90 }),
      location: locationFor(venue),
      description,
      sourceUrl: snapshot.url,
      ticketUrl: eventUrl,
      ...(price ? { price } : {}),
      identitySeed: `show:${eventUrl}:${start.toUTC().toISO()}`,
    } satisfies CalendarEvent;
  });
}
