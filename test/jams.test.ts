import { readFileSync } from 'node:fs';

import { DateTime } from 'luxon';
import { describe, expect, test } from 'vitest';

import { expandJams, parseJamSchedule } from '../src/jams.js';

const html = readFileSync(
  new URL('./fixtures/jams.html', import.meta.url),
  'utf8',
);
const snapshot = {
  html,
  url: 'https://hideouttheatre.com/austin-improv-classes/sunday-jams/',
  retrievedAt: DateTime.fromISO('2026-09-27T10:00:00', {
    zone: 'America/Chicago',
  }),
};

describe('parseJamSchedule', () => {
  test('extracts every published nonempty schedule cell and its block time', () => {
    const schedule = parseJamSchedule(snapshot);

    expect(schedule.slots).toHaveLength(13);
    expect(schedule.slots[0]).toMatchObject({
      ordinal: 1,
      title: 'Narrative Jam',
      start: { hour: 11, minute: 0 },
      end: { hour: 12, minute: 30 },
    });
    expect(schedule.slots.at(-1)).toMatchObject({
      ordinal: 5,
      title: 'Shortform Jam',
      start: { hour: 12, minute: 30 },
      end: { hour: 14, minute: 0 },
    });
  });

  test('associates descriptions by the table link anchor', () => {
    const schedule = parseJamSchedule(snapshot);
    const shortform = schedule.slots.find(
      ({ title }) => title === 'Shortform Jam',
    );

    expect(shortform?.description).toBe(
      'Recommended for anyone who has completed Level One.',
    );
  });

  test('extracts the Annex address and sign-in link', () => {
    const schedule = parseJamSchedule(snapshot);

    expect(schedule.location).toBe(
      'Hideout Annex, 5555 N Lamar Blvd B103, Austin, TX 78751',
    );
    expect(schedule.signInUrl).toBe('https://docs.google.com/forms/d/example');
  });
});

describe('expandJams', () => {
  const windowStart = DateTime.fromISO('2026-09-27T00:00:00', {
    zone: 'America/Chicago',
  });

  test('expands from the window start through twelve calendar months', () => {
    const events = expandJams(parseJamSchedule(snapshot), windowStart, 12);

    expect(events.length).toBeGreaterThan(100);
    expect(events.every(({ start }) => start >= windowStart)).toBe(true);
    expect(
      events.every(({ start }) => start < DateTime.fromISO('2027-09-01')),
    ).toBe(true);
  });

  test('does not create fifth-Sunday events in a four-Sunday month', () => {
    const events = expandJams(parseJamSchedule(snapshot), windowStart, 1);

    expect(events.some(({ start }) => start.toISODate() === '2026-09-29')).toBe(
      false,
    );
    expect(events.some(({ title }) => title === 'Shakespeare Jam')).toBe(false);
  });

  test('creates fifth-Sunday events when the date exists', () => {
    const events = expandJams(parseJamSchedule(snapshot), windowStart, 3);
    const shakespeare = events.find(({ title }) => title === 'Shakespeare Jam');

    expect(shakespeare?.start.toISO()).toBe('2026-11-29T11:00:00.000-06:00');
    expect(shakespeare?.end?.toISO()).toBe('2026-11-29T12:30:00.000-06:00');
  });

  test('produces complete free events with eligibility and sign-in details', () => {
    const events = expandJams(parseJamSchedule(snapshot), windowStart, 1);
    const shortform = events.find(({ title }) => title === 'Shortform Jam');

    expect(shortform).toMatchObject({
      kind: 'jam',
      price: 'Free',
      location: 'Hideout Annex, 5555 N Lamar Blvd B103, Austin, TX 78751',
      ticketUrl: 'https://docs.google.com/forms/d/example',
      description:
        'Recommended for anyone who has completed Level One.\n\nFree to attend; just show up and sign in.',
      sourceUrl:
        'https://hideouttheatre.com/austin-improv-classes/sunday-jams/',
    });
  });

  test('keeps identity seeds stable for the same occurrence', () => {
    const schedule = parseJamSchedule(snapshot);
    const first = expandJams(schedule, windowStart, 2).map(
      ({ identitySeed }) => identitySeed,
    );
    const second = expandJams(schedule, windowStart, 2).map(
      ({ identitySeed }) => identitySeed,
    );

    expect(first).toEqual(second);
  });
});
