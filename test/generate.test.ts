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

  test('refuses to replace the feed when the show page is unrecognizable', async () => {
    await expect(
      generateCalendar({
        showsHtml: '<html><body>Temporarily unavailable</body></html>',
        jamsHtml,
        generatedAt: DateTime.fromISO('2026-09-27T12:00:00', {
          zone: 'America/Chicago',
        }),
      }),
    ).rejects.toThrow(/show/i);
  });

  test('refuses to replace the feed when a populated jam cell is unparseable', async () => {
    const malformedJams = jamsHtml.replace(
      '<a href="#shortform-jam">Shortform Jam</a>',
      'Shortform Jam',
    );

    await expect(
      generateCalendar({
        showsHtml,
        jamsHtml: malformedJams,
        generatedAt: DateTime.fromISO('2026-09-27T12:00:00', {
          zone: 'America/Chicago',
        }),
      }),
    ).rejects.toThrow(/jam cell/i);
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

  test('instructs the HTTP client to reject redirects before following them', async () => {
    let redirectMode: RequestRedirect | undefined;
    await fetchSource('https://hideouttheatre.com/calendar/', {
      request: async (_input, init) => {
        redirectMode = init?.redirect;
        return new Response('<html>ok</html>');
      },
    });

    expect(redirectMode).toBe('error');
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

  test('cancels a chunked response as soon as it exceeds two MiB', async () => {
    let pulls = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls += 1;
        if (pulls > 4) {
          controller.close();
          return;
        }
        controller.enqueue(new Uint8Array(1024 * 1024));
      },
    });

    await expect(
      fetchSource('https://hideouttheatre.com/calendar/', {
        request: async () => new Response(body),
      }),
    ).rejects.toThrow(/too large/i);
    expect(pulls).toBeLessThanOrEqual(4);
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
