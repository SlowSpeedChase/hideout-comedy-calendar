import { readFileSync } from 'node:fs';

import { DateTime, Settings } from 'luxon';
import { describe, expect, test } from 'vitest';

import { parseShows } from '../src/shows.js';

const fixture = readFileSync(
  new URL('./fixtures/shows.html', import.meta.url),
  'utf8',
);
const sourceUrl = 'https://hideouttheatre.com/calendar/';
const retrievedAt = DateTime.fromISO('2026-12-30T12:00:00', {
  zone: 'America/Chicago',
});

describe('parseShows', () => {
  test('extracts complete show details and applies the estimated duration', () => {
    const [show] = parseShows({ html: fixture, url: sourceUrl, retrievedAt });

    expect(show).toMatchObject({
      kind: 'show',
      title: 'Maestro',
      durationMinutes: 90,
      location:
        'Hideout Annex – back, 5555 N Lamar Blvd B103, Austin, TX 78751',
      price: '$12 – $20',
      description:
        'Austin’s longest-running improv show.\n\nEnd time is estimated.',
      sourceUrl: sourceUrl,
      ticketUrl: 'https://hideouttheatre.com/shows/Maestro?event_id=1001',
    });
    expect(show?.start.toISO()).toBe('2026-12-26T21:30:00.000-06:00');
  });

  test('assigns December and January occurrences to the correct years', () => {
    const shows = parseShows({ html: fixture, url: sourceUrl, retrievedAt });

    expect(shows[0]?.start.toISODate()).toBe('2026-12-26');
    expect(shows[1]?.start.toISODate()).toBe('2027-01-02');
  });

  test('gives repeated shows distinct occurrence identities', () => {
    const [first, second] = parseShows({
      html: fixture,
      url: sourceUrl,
      retrievedAt,
    });

    expect(first?.identitySeed).not.toBe(second?.identitySeed);
  });

  test('allows missing optional price, venue, and ticket affordance', () => {
    const shows = parseShows({ html: fixture, url: sourceUrl, retrievedAt });
    const show = shows.find(({ title }) => title === 'Free Show');

    expect(show).toMatchObject({
      title: 'Free Show',
      location: '',
      description: 'No price or venue is listed.\n\nEnd time is estimated.',
    });
    expect(show).not.toHaveProperty('price');
  });

  test('prefers a machine-readable start over conflicting display text', () => {
    const shows = parseShows({ html: fixture, url: sourceUrl, retrievedAt });
    const show = shows.find(({ title }) => title === 'Machine Time');

    expect(show?.start.toISO()).toBe('2027-01-03T20:00:00.000-06:00');
  });

  test('interprets an offset-free machine time in Austin regardless of the runner zone', () => {
    const previousZone = Settings.defaultZone;
    Settings.defaultZone = 'UTC';
    try {
      const html = `
        <div class="event_notes"><a href="/shows/Local?event_id=10">
          <span class="event_name">Local Time</span>
          <span class="event_date"><time datetime="2027-01-03T20:00:00"></time>Sun Jan 3, 8:00pm<br>Hideout Theatre</span>
        </a></div>`;

      const [show] = parseShows({ html, url: sourceUrl, retrievedAt });

      expect(show?.start.toISO()).toBe('2027-01-03T20:00:00.000-06:00');
    } finally {
      Settings.defaultZone = previousZone;
    }
  });

  test('uses a published machine-readable end instead of estimating one', () => {
    const html = `
      <div class="event_notes"><a href="/shows/Timed?event_id=11">
        <span class="event_name">Timed Show</span>
        <span class="event_date">
          <time datetime="2027-01-03T20:00:00-06:00"></time>
          <time datetime="2027-01-03T22:00:00-06:00"></time>
          Sun Jan 3, 8:00pm<br>Hideout Theatre
        </span>
        <p>A two-hour special.</p>
      </a></div>`;

    const [show] = parseShows({ html, url: sourceUrl, retrievedAt });

    expect(show?.end?.toISO()).toBe('2027-01-03T22:00:00.000-06:00');
    expect(show).not.toHaveProperty('durationMinutes');
    expect(show?.description).toBe('A two-hour special.');
  });

  test('resolves event links relative to the calendar page', () => {
    const [show] = parseShows({ html: fixture, url: sourceUrl, retrievedAt });

    expect(show?.ticketUrl).toBe(
      'https://hideouttheatre.com/shows/Maestro?event_id=1001',
    );
    expect(show?.sourceUrl).toBe(sourceUrl);
  });

  test('rejects event markup with a malformed display date', () => {
    const html = `
      <div class="event_notes"><a href="/shows/Broken?event_id=9">
        <span class="event_name">Broken</span>
        <span class="event_date">sometime soon<br>Hideout Annex</span>
      </a></div>`;

    expect(() => parseShows({ html, url: sourceUrl, retrievedAt })).toThrow(
      /could not parse show date/i,
    );
  });
});
