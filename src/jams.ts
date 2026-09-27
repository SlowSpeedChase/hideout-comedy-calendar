import { load } from 'cheerio';
import type { DateTime } from 'luxon';

import type { CalendarEvent, SourceSnapshot } from './model.js';
import { nthSunday } from './time.js';

const ZONE = 'America/Chicago';

export interface ClockTime {
  hour: number;
  minute: number;
}

export interface JamSlot {
  ordinal: 1 | 2 | 3 | 4 | 5;
  title: string;
  start: ClockTime;
  end: ClockTime;
  description: string;
}

export interface JamSchedule {
  slots: JamSlot[];
  location: string;
  sourceUrl: string;
  signInUrl?: string;
}

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function ordinalFrom(value: string): JamSlot['ordinal'] {
  const ordinal = ['first', 'second', 'third', 'fourth', 'fifth'].findIndex(
    (name) => value.toLowerCase().includes(name),
  );
  if (ordinal < 0) {
    throw new Error(`Invalid Sunday ordinal: ${value}`);
  }
  return (ordinal + 1) as JamSlot['ordinal'];
}

function clockCandidates(
  value: string,
): Array<ClockTime & { minutes: number }> {
  const match = value.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)?$/i);
  if (!match?.[1]) {
    throw new Error(`Invalid jam time: ${value}`);
  }
  const hour = Number(match[1]);
  const minute = Number(match[2] ?? '0');
  const explicit = match[3]?.toLowerCase();
  if (hour < 1 || hour > 12 || minute > 59) {
    throw new Error(`Invalid jam time: ${value}`);
  }
  const meridiems = explicit ? [explicit] : ['am', 'pm'];
  return meridiems.map((meridiem) => {
    const hour24 = (hour % 12) + (meridiem === 'pm' ? 12 : 0);
    return { hour: hour24, minute, minutes: hour24 * 60 + minute };
  });
}

function parseClockRange(value: string): { start: ClockTime; end: ClockTime } {
  const [startText, endText] = value
    .toLowerCase()
    .replace(/\s+/g, '')
    .split('-');
  if (!startText || !endText) {
    throw new Error(`Invalid jam time range: ${value}`);
  }
  const end = clockCandidates(endText)[0];
  if (!end) {
    throw new Error(`Invalid jam end time: ${value}`);
  }
  const start = clockCandidates(startText)
    .filter((candidate) => candidate.minutes < end.minutes)
    .sort((a, b) => end.minutes - a.minutes - (end.minutes - b.minutes))[0];
  if (!start) {
    throw new Error(`Invalid jam start time: ${value}`);
  }
  return {
    start: { hour: start.hour, minute: start.minute },
    end: { hour: end.hour, minute: end.minute },
  };
}

function canonicalLocation(pageText: string): string {
  const match = pageText.match(
    /The Hideout Annex\s*[—-]\s*(5555\s+N\.?\s+Lamar Blvd\.?\s+B103)/i,
  );
  if (!match?.[1]) {
    throw new Error('Sunday Jams page is missing the Annex address');
  }
  const street = match[1].replace(/N\./i, 'N').replace(/Blvd\./i, 'Blvd');
  return `Hideout Annex, ${normalize(street)}, Austin, TX 78751`;
}

export function parseJamSchedule(snapshot: SourceSnapshot): JamSchedule {
  const $ = load(snapshot.html);
  const descriptions = new Map<string, string>();
  $('h3[id]').each((_index, heading) => {
    const id = $(heading).attr('id');
    if (id) {
      descriptions.set(id, normalize($(heading).next('p').text()));
    }
  });

  const table = $('table')
    .filter((_index, candidate) =>
      normalize($(candidate).find('th').first().text()).includes(
        'MONTHLY JAM SCHEDULE',
      ),
    )
    .first();
  if (!table.length) {
    throw new Error('Sunday Jams schedule table was not found');
  }

  const ranges = table
    .find('thead th')
    .toArray()
    .slice(1)
    .map((heading) => parseClockRange(normalize($(heading).text())));
  const slots: JamSlot[] = [];
  table.find('tbody tr').each((_rowIndex, row) => {
    const cells = $(row).find('td').toArray();
    const label = normalize($(cells[0]).text());
    const ordinal = ordinalFrom(label);
    cells.slice(1).forEach((cell, columnIndex) => {
      const link = $(cell).find('a[href^="#"]').first();
      const title = normalize(link.text());
      if (!title) {
        if (normalize($(cell).text())) {
          throw new Error('Populated jam cell has no recognizable anchor link');
        }
        return;
      }
      const range = ranges[columnIndex];
      if (!range) {
        throw new Error(`Jam ${title} has no matching time block`);
      }
      const anchor = link.attr('href')?.slice(1) ?? '';
      const description = descriptions.get(anchor);
      if (!description) {
        throw new Error(`Jam ${title} is missing its matching description`);
      }
      slots.push({
        ordinal,
        title,
        ...range,
        description,
      });
    });
  });
  if (slots.length === 0) {
    throw new Error('Sunday Jams schedule contains no recognizable jam slots');
  }

  const signInUrl = $('a[href*="docs.google.com"]').first().attr('href');
  return {
    slots,
    location: canonicalLocation($.root().text()),
    sourceUrl: snapshot.url,
    ...(signInUrl
      ? { signInUrl: new URL(signInUrl, snapshot.url).toString() }
      : {}),
  };
}

export function expandJams(
  schedule: JamSchedule,
  windowStart: DateTime,
  months: number,
): CalendarEvent[] {
  if (!Number.isInteger(months) || months < 1) {
    throw new Error(`Invalid month count: ${months}`);
  }
  const startBoundary = windowStart.setZone(ZONE);
  const endBoundary = startBoundary.plus({ months });
  const firstMonth = startBoundary.startOf('month');
  const events: CalendarEvent[] = [];

  for (
    let month = firstMonth;
    month < endBoundary;
    month = month.plus({ months: 1 })
  ) {
    for (const slot of schedule.slots) {
      const date = nthSunday(month.year, month.month, slot.ordinal);
      if (!date) continue;
      const start = date.set(slot.start);
      if (start < startBoundary || start >= endBoundary) continue;
      let end = date.set(slot.end);
      if (end <= start) end = end.plus({ days: 1 });
      const description = [
        slot.description,
        'Free to attend; just show up and sign in.',
      ]
        .filter(Boolean)
        .join('\n\n');
      events.push({
        kind: 'jam',
        title: slot.title,
        start,
        end,
        location: schedule.location,
        description,
        sourceUrl: schedule.sourceUrl,
        ...(schedule.signInUrl ? { ticketUrl: schedule.signInUrl } : {}),
        price: 'Free',
        identitySeed: `jam:${slot.title.toLowerCase()}:${start.toUTC().toISO()}`,
      });
    }
  }

  return events.sort((a, b) => a.start.toMillis() - b.start.toMillis());
}
