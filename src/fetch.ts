import { DateTime } from 'luxon';

import type { SourceSnapshot } from './model.js';

export const SHOWS_URL = 'https://hideouttheatre.com/calendar/';
export const JAMS_URL =
  'https://hideouttheatre.com/austin-improv-classes/sunday-jams/';

const ALLOWED_URLS = new Set([SHOWS_URL, JAMS_URL]);
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

export type RequestFunction = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export interface FetchSourceOptions {
  now?: DateTime;
  request?: RequestFunction;
}

export async function fetchSource(
  inputUrl: string,
  options: FetchSourceOptions = {},
): Promise<SourceSnapshot> {
  const url = new URL(inputUrl).toString();
  if (!ALLOWED_URLS.has(url)) {
    throw new Error(`Source URL is not allowed: ${url}`);
  }

  const request = options.request ?? fetch;
  const response = await request(url, {
    headers: {
      'user-agent':
        'HideoutComedyCalendar/0.1 (+https://github.com/chaseeasterling/hideout-comedy-calendar)',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(
      `Hideout request failed with HTTP ${response.status}: ${url}`,
    );
  }
  if (response.url && !ALLOWED_URLS.has(new URL(response.url).toString())) {
    throw new Error(
      `Hideout request redirected outside the allowlist: ${response.url}`,
    );
  }

  const declaredSize = Number(response.headers.get('content-length') ?? '0');
  if (declaredSize > MAX_RESPONSE_BYTES) {
    throw new Error(`Hideout response is too large: ${declaredSize} bytes`);
  }
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > MAX_RESPONSE_BYTES) {
    throw new Error(`Hideout response is too large: ${bytes.byteLength} bytes`);
  }

  return {
    url,
    html: new TextDecoder().decode(bytes),
    retrievedAt: options.now ?? DateTime.now().setZone('America/Chicago'),
  };
}
