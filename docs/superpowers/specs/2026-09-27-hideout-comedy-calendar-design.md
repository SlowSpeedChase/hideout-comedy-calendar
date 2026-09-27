# Hideout Comedy Calendar Design

**Date:** 2026-09-27  
**Status:** Ready  
**Owner:** Chase  
**Scope:** Hideout Theatre shows and Sunday Jams only

## Purpose

Create a personal, read-only calendar of Hideout Theatre comedy events that is
easy to browse from Apple Calendar on iPhone, iPad, and Mac. The calendar must
refresh without a Mac being awake and require no ongoing manual copying.

## Success Criteria

- A single public-but-unlisted URL can be subscribed to from Apple Calendar.
- Every event currently listed on the Hideout show calendar appears once.
- The published Sunday Jam rotation appears for the next 12 months.
- Events show useful time, location, price, description, and source/ticket links.
- Changed upstream details update the matching event without creating a duplicate.
- A failed or malformed scrape cannot replace the working feed with an empty one.
- The generator handles year boundaries, fifth Sundays, and Central Time daylight
  saving transitions.

## User Experience

The user subscribes once to a calendar named **Hideout Comedy**. It appears as a
separate, colorable calendar in Apple Calendar and stays in sync across Apple
devices. Events are read-only. The feed defines no alarms, avoiding notification
noise; an interesting event can be copied to a personal calendar for custom
alerts.

### Show events

Each show contains:

- Title
- Published start time and an estimated 90-minute duration when no end is given
- Published venue and address
- Price, when present
- Short description
- Direct ticket/event URL and Hideout calendar source URL

### Sunday Jam events

Each jam contains:

- Jam name
- Exact block time from the published monthly schedule
- Hideout Annex address
- Eligibility or audience notes from the matching jam description
- Sunday Jams source URL and sign-in link when published

The generator expands the first-through-fifth-Sunday rotation into dated events
for a rolling 12-month window. Empty schedule cells create no event.

## Architecture

The project is a small TypeScript command-line generator with no database,
server, authentication, analytics, or custom application.

```text
Hideout show calendar ----> show parser ----\
                                            normalized events --> ICS renderer
Hideout Sunday Jams page -> jam parser ----/                         |
                                                                     v
                                                         GitHub Pages feed
                                                                     |
                                                                     v
                                                               Apple Calendar
```

### Components

1. **HTTP client** fetches only the two configured HTTPS Hideout URLs with a
   descriptive user agent, timeout, and bounded response size.
2. **Show parser** extracts event occurrences from the show calendar. It prefers
   machine-readable date/time attributes and uses date headings only as a
   validated fallback.
3. **Jam parser** extracts the Sunday ordinal schedule, time blocks, descriptions,
   address, and sign-in link, then expands the schedule into concrete dates.
4. **Normalizer** produces one internal event shape and rejects events missing a
   title, valid start time, or source URL.
5. **ICS renderer** emits RFC 5545-compatible content in `America/Chicago`, with
   stable UIDs and calendar refresh metadata.
6. **Publisher workflow** runs four times daily and on demand, validates the
   output, and deploys it to GitHub Pages only after every check succeeds.

## Event Identity and Updates

Show UIDs are derived from the canonical event URL plus the occurrence start
time. Jam UIDs are derived from the jam name plus occurrence start time. This
keeps an event stable when its description, price, venue, or title changes while
allowing distinct performances of the same show.

The renderer sorts events deterministically and emits a content-derived revision
timestamp. A new successful deployment replaces the feed atomically. Events no
longer present upstream are omitted from the new subscribed feed and therefore
disappear when Apple Calendar refreshes it.

## Date and Time Rules

- The canonical zone is `America/Chicago`.
- Explicit machine-readable years take precedence.
- If the source omits a year, the parser infers the occurrence nearest the page's
  retrieval date within an allowed past/future window and handles December to
  January rollover explicitly.
- Shows without an end time receive `DURATION:PT90M` and an “estimated end time”
  note.
- Jam block end times come directly from the published table.
- Calendar output includes timezone-safe values so daylight saving changes do not
  shift local wall-clock times.

## Failure Handling

- Network, parse, validation, or test failures stop the workflow before deploy.
- A suspicious result of zero shows is rejected while the show calendar contains
  event markup.
- Duplicate UIDs, invalid dates, missing required fields, and malformed ICS are
  build failures.
- GitHub Pages retains the previous successful deployment, providing the last
  known-good calendar automatically.
- Workflow logs identify which source and validation failed without publishing
  source HTML as an artifact.

## Testing

Version-controlled HTML fixtures cover both source pages. Unit and integration
tests cover:

- Show field extraction and multiple performances
- Missing optional price, description, venue, and end time
- December/January year inference
- First through fifth Sunday calculations
- Months without a fifth Sunday
- Central Time daylight saving boundaries
- Stable IDs and duplicate rejection
- Escaping commas, semicolons, backslashes, and newlines in ICS text
- Malformed and empty source pages
- Deterministic full-feed snapshots

The CI workflow runs formatting, linting, type checking, unit tests, fixture-based
integration tests, generation, and an ICS validation smoke test before publishing.
A live-source smoke command is available for manual verification without making
routine tests depend on Hideout availability.

## Deployment and Operations

- Source and generated feed are hosted in a public GitHub repository named
  `hideout-comedy-calendar`.
- GitHub Actions receives read-only repository contents permission and Pages-only
  deployment permissions.
- The scheduled job runs every six hours; manual dispatch supports immediate
  refresh after a known schedule change.
- The Pages root exposes `hideout-comedy.ics` and a minimal subscription page with
  an Apple-friendly `webcal://` link and setup instructions.
- No secrets or personal calendar data are stored.

## Out of Scope

- Venues other than the Hideout Theatre
- Editing or writing directly into iCloud calendars
- Personalized recommendations, attendance tracking, alerts, or ticket purchases
- A custom mobile application or general event-discovery website
- Republishing images or full long-form copyrighted descriptions

## Ready for Implementation

- [x] Acceptance criteria defined
- [x] ADHD check passed: one dedicated calendar externalizes the schedule and
      removes repeated website checking
- [x] Scope check passed: one focused generator and deployment workflow
- [x] No design blockers
