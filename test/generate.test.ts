import { readFileSync } from 'node:fs';

import { DateTime } from 'luxon';
import { describe, expect, test } from 'vitest';

import { fetchSource } from '../src/fetch.js';
import { generateCalendar } from '../src/generate.js';

const showsHtml = readFileSync(
  new URL('./fixtures/shows.html', import.meta.url),
  'utf8',
);
const jamsHtml = readFileSync(
  new URL('./fixtures/jams.html', import.meta.url),
  'utf8',
);

describe('generateCalendar', () => {
  test('turns the two source fixtures into one validated feed', async () => {
    const generatedAt = DateTime.fromISO('2026-12-30T12:00:00', {
      zone: 'America/Chicago',
    });

    const result = await generateCalendar({
      showsHtml,
      jamsHtml,
      generatedAt,
    });

    expect(result.events.filter(({ kind }) => kind === 'show')).toHaveLength(4);
    expect(
      result.events.filter(({ kind }) => kind === 'jam').length,
    ).toBeGreaterThan(100);
    expect(result.ics).toContain('X-WR-CALNAME:Hideout Comedy');
    expect(result.ics).toContain('SUMMARY:Maestro');
    expect(result.ics).toContain('SUMMARY:Shortform Jam');
  });
});

describe('fetchSource', () => {
  test('rejects a URL outside the two-source allowlist before requesting it', async () => {
    await expect(
      fetchSource('https://example.com/events', {
        request: async () => new Response('should not run'),
      }),
    ).rejects.toThrow(/not allowed/i);
  });

  test('rejects an HTTP error response', async () => {
    await expect(
      fetchSource('https://hideouttheatre.com/calendar/', {
        request: async () => new Response('unavailable', { status: 503 }),
      }),
    ).rejects.toThrow(/503/);
  });

  test('rejects a response larger than two MiB', async () => {
    await expect(
      fetchSource('https://hideouttheatre.com/calendar/', {
        request: async () =>
          new Response('small body', {
            headers: { 'content-length': String(2 * 1024 * 1024 + 1) },
          }),
      }),
    ).rejects.toThrow(/too large/i);
  });

  test('returns a timestamped source snapshot for an allowed response', async () => {
    const now = DateTime.fromISO('2026-09-27T12:00:00Z');
    const result = await fetchSource('https://hideouttheatre.com/calendar/', {
      now,
      request: async () => new Response('<html>ok</html>'),
    });

    expect(result).toEqual({
      url: 'https://hideouttheatre.com/calendar/',
      html: '<html>ok</html>',
      retrievedAt: now,
    });
  });
});
