import { DateTime } from 'luxon';

import { fetchSource, JAMS_URL, SHOWS_URL } from './fetch.js';
import { expandJams, parseJamSchedule } from './jams.js';
import { renderCalendar, validateEvents } from './ics.js';
import type { CalendarEvent, SourceSnapshot } from './model.js';
import { parseShows } from './shows.js';

export interface GenerateOptions {
  generatedAt?: DateTime;
  showsHtml?: string;
  jamsHtml?: string;
}

export interface GeneratedCalendar {
  events: CalendarEvent[];
  ics: string;
}

function inlineSnapshot(
  url: string,
  html: string,
  generatedAt: DateTime,
): SourceSnapshot {
  return { url, html, retrievedAt: generatedAt };
}

export async function generateCalendar(
  options: GenerateOptions = {},
): Promise<GeneratedCalendar> {
  const generatedAt =
    options.generatedAt ?? DateTime.now().setZone('America/Chicago');
  const showsSnapshot = options.showsHtml
    ? inlineSnapshot(SHOWS_URL, options.showsHtml, generatedAt)
    : await fetchSource(SHOWS_URL, { now: generatedAt });
  const jamsSnapshot = options.jamsHtml
    ? inlineSnapshot(JAMS_URL, options.jamsHtml, generatedAt)
    : await fetchSource(JAMS_URL, { now: generatedAt });

  const shows = parseShows(showsSnapshot);
  const jams = expandJams(
    parseJamSchedule(jamsSnapshot),
    generatedAt.startOf('day'),
    12,
  );
  const events = [...shows, ...jams];
  validateEvents(events, {
    showMarkupDetected: /class=["'][^"']*event_notes\b/i.test(
      showsSnapshot.html,
    ),
  });
  return { events, ics: renderCalendar(events, generatedAt) };
}
