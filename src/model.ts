import type { DateTime } from 'luxon';

export type EventKind = 'show' | 'jam';

export interface CalendarEvent {
  kind: EventKind;
  title: string;
  start: DateTime;
  end?: DateTime;
  durationMinutes?: number;
  location: string;
  description: string;
  sourceUrl: string;
  ticketUrl?: string;
  price?: string;
  identitySeed: string;
}

export interface SourceSnapshot {
  url: string;
  html: string;
  retrievedAt: DateTime;
}
