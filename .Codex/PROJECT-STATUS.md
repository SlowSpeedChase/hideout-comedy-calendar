# Project Status

**Status:** live

## Delivered

- Typed normalized event model in `America/Chicago`
- Hideout show parser with stable performance identity
- Sunday Jam schedule parser and rolling 12-month expansion
- Validated RFC 5545 calendar renderer with deterministic output
- Bounded, allowlisted live fetcher and atomic generator CLI
- Accessible static Apple subscription page
- Pull-request verification and six-hour GitHub Pages publishing workflows
- Fixture, unit, integration, and static-site coverage

## Public endpoints

- Site: `https://slowspeedchase.github.io/hideout-comedy-calendar/`
- Feed: `https://slowspeedchase.github.io/hideout-comedy-calendar/hideout-comedy.ics`

Both endpoints were verified over HTTPS after GitHub Pages deployment on
2026-09-27. The deployed feed contained 150 events.

## Verification evidence

- Clean dependency install completed with Node.js 22
- Formatting, lint, type checking, build, and 47 tests pass
- Live generation produced 150 unique events through September 26, 2027
- Representative show and jam events retain correct Austin wall-clock times
- ICS uses CRLF, folds at 75 bytes, and contains no alarms
- Independent whole-branch review found no remaining release blockers

## Deferred minor

Every successful refresh currently stamps events with its generation time. That
makes the feed content change every six hours even when listings are unchanged.
This is safe but may cause Apple Calendar to reprocess unchanged events; a future
stateful revision strategy can avoid that churn.
