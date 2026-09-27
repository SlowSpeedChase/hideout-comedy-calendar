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

async function readBoundedBody(response: Response): Promise<Uint8Array> {
  if (!response.body) return new Uint8Array();

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_RESPONSE_BYTES) {
        await reader.cancel('response size limit exceeded');
        throw new Error(
          `Hideout response is too large: over ${MAX_RESPONSE_BYTES} bytes`,
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
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
    redirect: 'error',
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
  const bytes = await readBoundedBody(response);

  return {
    url,
    html: new TextDecoder().decode(bytes),
    retrievedAt: options.now ?? DateTime.now().setZone('America/Chicago'),
  };
}
