# Hideout Comedy Calendar

A personal, read-only Apple Calendar subscription for [The Hideout Theatre’s
shows](https://hideouttheatre.com/calendar/) and [Sunday
Jams](https://hideouttheatre.com/austin-improv-classes/sunday-jams/).

The hosted feed refreshes from the Hideout’s public listings every six hours on
GitHub Actions, so no Mac needs to stay awake.

## Subscribe

Open the hosted page:

**https://chaseeasterling.github.io/hideout-comedy-calendar/**

Or use the feed directly:

**https://chaseeasterling.github.io/hideout-comedy-calendar/hideout-comedy.ics**

### iPhone or iPad

1. Open the hosted page in Safari and tap **Add to Apple Calendar**.
2. Approve the subscription and tap **Add**.

If the one-tap link does not open, go to **Settings → Apps → Calendar → Calendar
Accounts → Add Account → Other → Add Subscribed Calendar**, then paste the HTTPS
feed URL above.

### Mac

1. Open Calendar.
2. Choose **File → New Calendar Subscription**.
3. Paste the HTTPS feed URL above and choose an automatic refresh interval.

The subscribed calendar is read-only and includes no alarms. Give it any color
you like in Apple Calendar.

## Local development

Requires Node.js 22 or newer.

```bash
npm ci
npm run verify
```

Build a deterministic fixture-backed preview:

```bash
npm run build:site
npm run generate -- \
  --shows test/fixtures/shows.html \
  --jams test/fixtures/jams.html \
  --output public/hideout-comedy.ics
```

Run a live-source smoke generation:

```bash
npm run generate -- --output public/hideout-comedy.ics
```

Generated files stay in `public/` and are intentionally not committed.

## Publishing

`.github/workflows/publish.yml` verifies the project, fetches both live Hideout
pages, generates the ICS feed, and deploys `public/` to GitHub Pages. It runs:

- after a push to `main`;
- at minute 17 every six hours; and
- on demand from **Actions → Publish calendar → Run workflow**.

In **Settings → Pages**, set **Source** to **GitHub Actions**. A failed scrape or
validation stops before deployment, so the previous successful calendar remains
available.

For operating details and failure diagnosis, see [`.Codex/OPERATIONS.md`](.Codex/OPERATIONS.md).

## Privacy and scope

The project stores no Apple credentials, personal calendar data, analytics, or
secrets. The subscription URL is public but unlisted. Only Hideout Theatre shows
and the published Sunday Jam rotation are included.
