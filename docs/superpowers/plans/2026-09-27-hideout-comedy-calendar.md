# Hideout Comedy Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a reliable, automatically refreshed Apple Calendar subscription containing Hideout Theatre shows and Sunday Jams.

**Architecture:** A TypeScript CLI fetches or reads the two Hideout pages, parses them into a shared event model, expands the jam rotation, validates the collection, and renders a deterministic RFC 5545 feed. GitHub Actions runs the same verified CLI every six hours and deploys the generated static files to GitHub Pages only on success.

**Tech Stack:** Node.js 22, TypeScript, Cheerio, Luxon, Vitest, ESLint, Prettier, GitHub Actions, GitHub Pages

**Spec:** `docs/superpowers/specs/2026-09-27-hideout-comedy-calendar-design.md`

## Global Constraints

- Fetch only `https://hideouttheatre.com/calendar/` and `https://hideouttheatre.com/austin-improv-classes/sunday-jams/`.
- Use `America/Chicago` for interpreting published local times and UTC in event timestamps.
- Give shows without published end times a 90-minute duration and label that duration as estimated.
- Expand the jam rotation through a rolling 12-month window.
- Emit no calendar alarms and store no secrets or personal calendar data.
- Reject invalid or suspicious output before deployment so Pages retains the last successful feed.
- Keep the implementation focused: no database, server, authentication, analytics, or custom app.

## Review Focus

- A calendar rendered near New Year must assign December and January shows to the correct years; Task 2 tests the rollover explicitly.
- A recurring show with one canonical URL and two times must produce distinct stable UIDs; Task 2 and Task 4 test this.
- A month without a fifth Sunday must never receive a fifth-Sunday jam; Task 3 tests both four- and five-Sunday months.
- Upstream HTML with event-like markup but zero valid shows must fail rather than publish an empty calendar; Task 4 tests this validation path.
- Text containing commas, semicolons, backslashes, newlines, or long UTF-8 values must remain valid after ICS escaping and line folding; Task 4 tests round-tripping these values.

---

### Task 1: Project Foundation and Event Model

**Files:**

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `eslint.config.js`
- Create: `.prettierrc.json`
- Create: `src/model.ts`
- Create: `src/time.ts`
- Test: `test/time.test.ts`

**Interfaces:**

- Produces: `CalendarEvent`, `EventKind`, `SourceSnapshot`, and `parseLocalDateTime(dateText, timeText, retrievedAt): DateTime`.
- Produces: `nthSunday(year, month, ordinal): DateTime | null` for later jam expansion.

- [ ] **Step 1: Add the Node/TypeScript/Vitest toolchain and scripts**

Define `format:check`, `lint`, `typecheck`, `test`, `build`, `generate`, and `verify` scripts. Pin Node to `>=22` and configure strict ESM TypeScript output in `dist/`.

- [ ] **Step 2: Write failing time tests**

Test `parseLocalDateTime` for Central Time, DST, and a December/January page retrieved on December 30. Test `nthSunday` for first, fourth, present fifth, and absent fifth Sundays.

- [ ] **Step 3: Run the tests and confirm the missing-module failure**

Run: `npm test -- --run test/time.test.ts`  
Expected: FAIL because `src/time.ts` does not exist.

- [ ] **Step 4: Implement the model and time helpers**

`CalendarEvent` must carry kind, title, start, end or duration, location, description, source URL, optional ticket URL and price, and stable identity seed. Reject ambiguous or invalid local times.

- [ ] **Step 5: Verify and commit**

Run: `npm run verify`  
Expected: all configured checks pass.

Commit: `feat(core): add event model and time helpers`

### Task 2: Hideout Show Parser

**Files:**

- Create: `src/shows.ts`
- Create: `test/fixtures/shows.html`
- Test: `test/shows.test.ts`

**Interfaces:**

- Consumes: `CalendarEvent` and `parseLocalDateTime` from Task 1.
- Produces: `parseShows(snapshot: SourceSnapshot): CalendarEvent[]`.

- [ ] **Step 1: Capture a minimal representative fixture from the live show page**

Keep only the page structures required to represent multiple dates, repeated shows, optional fields, ticket URLs, and an event near a year boundary.

- [ ] **Step 2: Write failing parser tests**

Assert exact title, Central start, 90-minute duration, location, price, description, canonical URL, distinct occurrences, and correct December/January years. Include missing optional fields and malformed date cases.

- [ ] **Step 3: Run the focused tests and confirm failure**

Run: `npm test -- --run test/shows.test.ts`  
Expected: FAIL because `parseShows` is not implemented.

- [ ] **Step 4: Implement `parseShows(snapshot)`**

Prefer machine-readable date/time attributes. Use date headings as a validated fallback, normalize whitespace, resolve relative links against the source URL, and ignore unrelated page content.

- [ ] **Step 5: Verify and commit**

Run: `npm run verify`  
Expected: all checks pass.

Commit: `feat(shows): parse Hideout show listings`

### Task 3: Sunday Jam Parser and Expansion

**Files:**

- Create: `src/jams.ts`
- Create: `test/fixtures/jams.html`
- Test: `test/jams.test.ts`

**Interfaces:**

- Consumes: `CalendarEvent`, `SourceSnapshot`, and `nthSunday` from Task 1.
- Produces: `parseJamSchedule(snapshot): JamSchedule` and `expandJams(schedule, windowStart, months): CalendarEvent[]`.

- [ ] **Step 1: Capture a minimal representative fixture from the live Jams page**

Retain the ordinal rows, time headers, empty cells, named description sections, Annex address, and sign-in link.

- [ ] **Step 2: Write failing schedule and expansion tests**

Assert all published jam names and block times, description association, address/link extraction, 12-month boundary behavior, no phantom fifth-Sunday event, a real fifth-Sunday event, and stable identity seeds.

- [ ] **Step 3: Run the focused tests and confirm failure**

Run: `npm test -- --run test/jams.test.ts`  
Expected: FAIL because the jam interfaces are not implemented.

- [ ] **Step 4: Implement parsing and expansion**

Model table cells by Sunday ordinal and time column. Match descriptions by normalized heading text and create concrete Central Time occurrences from `windowStart` through 12 calendar months.

- [ ] **Step 5: Verify and commit**

Run: `npm run verify`  
Expected: all checks pass.

Commit: `feat(jams): expand the Sunday Jam rotation`

### Task 4: ICS Renderer, Validation, and CLI

**Files:**

- Create: `src/ics.ts`
- Create: `src/fetch.ts`
- Create: `src/generate.ts`
- Create: `src/cli.ts`
- Test: `test/ics.test.ts`
- Test: `test/generate.test.ts`

**Interfaces:**

- Consumes: show and jam parser interfaces from Tasks 2 and 3.
- Produces: `renderCalendar(events, generatedAt): string`, `validateEvents(events, sourceSignals): void`, and `generateCalendar(options): Promise<GeneratedCalendar>`.
- Produces CLI: `npm run generate -- --output public/hideout-comedy.ics` with optional fixture paths for deterministic tests.

- [ ] **Step 1: Write failing renderer and orchestration tests**

Assert deterministic ordering, CRLF output, escaping and 75-octet folding, six-hour refresh metadata, no alarms, distinct/stable SHA-256 UIDs, duplicate rejection, invalid date rejection, suspicious zero-show rejection, and fixture-to-feed generation.

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `npm test -- --run test/ics.test.ts test/generate.test.ts`  
Expected: FAIL because renderer and generator modules do not exist.

- [ ] **Step 3: Implement the RFC 5545 renderer and validation**

Render UTC `DTSTART`/`DTEND` values, transparent confirmed events, canonical URLs, deterministic `DTSTAMP`, and no `VALARM`. Fold content by UTF-8 octets without splitting a code point.

- [ ] **Step 4: Implement bounded HTTP fetching and the CLI**

Use an allowlist, 15-second timeout, 2 MiB response limit, descriptive user agent, explicit HTTP error handling, atomic local writes, and nonzero exit status on any failure.

- [ ] **Step 5: Verify and commit**

Run: `npm run verify && npm run generate -- --shows test/fixtures/shows.html --jams test/fixtures/jams.html --output public/hideout-comedy.ics`  
Expected: checks pass and the fixture feed is generated.

Commit: `feat(feed): generate a validated calendar subscription`

### Task 5: GitHub Pages Delivery and User Documentation

**Files:**

- Create: `.github/workflows/verify.yml`
- Create: `.github/workflows/publish.yml`
- Create: `scripts/build-site.ts`
- Create: `public/index.html` (generated)
- Create: `README.md`
- Create: `.node-version`
- Create: `.Codex/OPERATIONS.md`
- Create: `.Codex/PROJECT-STATUS.md`
- Create: `BRANCH-STATUS.md`
- Modify: `docs/plans/INDEX.md`
- Test: `test/site.test.ts`

**Interfaces:**

- Consumes: the CLI from Task 4.
- Produces: a Pages artifact containing `index.html` and `hideout-comedy.ics`, plus scheduled/manual publishing and Apple subscription instructions.

- [ ] **Step 1: Write the failing static-site test**

Assert the page names Hideout Comedy, links to the HTTPS feed and equivalent `webcal://` subscription URL, and includes short iPhone/iPad and Mac instructions.

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `npm test -- --run test/site.test.ts`  
Expected: FAIL because the site builder does not exist.

- [ ] **Step 3: Implement site generation and verification CI**

Build accessible semantic HTML with no JavaScript dependency. Run `npm ci` and `npm run verify` on pushes and pull requests.

- [ ] **Step 4: Implement safe scheduled Pages publishing**

Run at minute 17 every six hours and on manual dispatch. Generate from live sources, run full verification, upload `public/`, and deploy only after success with minimal Pages permissions and concurrency control.

- [ ] **Step 5: Document setup and operations**

Document local fixture generation, live smoke generation, GitHub Pages enablement, the final feed URL pattern, Apple subscription steps, manual refresh, and failure diagnosis.

- [ ] **Step 6: Verify the live source and commit**

Run: `npm run verify && npm run generate -- --output public/hideout-comedy.ics`  
Expected: checks pass and the live feed contains at least one show plus 12 months of jams.

Commit: `feat(deploy): publish the Apple Calendar feed`

### Task 6: Final Review and Release Readiness

**Files:**

- Modify: `BRANCH-STATUS.md`
- Modify: `.Codex/PROJECT-STATUS.md`
- Modify: `docs/plans/INDEX.md`

**Interfaces:**

- Consumes: the complete project.
- Produces: review-ready branch with evidence for every acceptance criterion.

- [ ] **Step 1: Run the complete clean verification**

Run: `npm ci && npm run verify && npm run generate -- --output public/hideout-comedy.ics && git diff --check`  
Expected: every command succeeds and the generated calendar is nonempty.

- [ ] **Step 2: Inspect the generated feed manually**

Confirm representative show and jam events, URLs, Austin wall-clock times, CRLF line endings, no duplicate UIDs, and no alarms.

- [ ] **Step 3: Perform whole-branch code review**

Review against the design, plan, security boundaries, parsing resilience, GitHub workflow permissions, and Apple Calendar usability; address every actionable finding.

- [ ] **Step 4: Update project state and commit**

Mark implementation and verification evidence in project status documents without claiming GitHub deployment until a remote and Pages URL are confirmed.

Commit: `docs: record calendar release readiness`
