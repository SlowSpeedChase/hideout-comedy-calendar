# Operations

## Service shape

- **Inputs:** the Hideout show calendar and Sunday Jams page
- **Output:** a static GitHub Pages site plus `hideout-comedy.ics`
- **Schedule:** minute 17 every six hours, Central Time independent
- **State:** none; each successful run replaces the Pages artifact
- **Secrets:** none

## Local checks

Install and verify:

```bash
npm ci
npm run verify
```

Generate from fixtures without network access:

```bash
npm run build:site
npm run generate -- \
  --shows test/fixtures/shows.html \
  --jams test/fixtures/jams.html \
  --output public/hideout-comedy.ics
```

Generate from the live Hideout pages:

```bash
npm run generate -- --output public/hideout-comedy.ics
```

Confirm the output contains both source types:

```bash
rg -n "X-HIDEOUT-SOURCE:(show|jam)" public/hideout-comedy.ics
rg -c "BEGIN:VEVENT" public/hideout-comedy.ics
```

## GitHub Pages setup

1. Create the public repository `chaseeasterling/hideout-comedy-calendar`.
2. Push `main`.
3. Open **Settings → Pages**.
4. Set **Source** to **GitHub Actions**.
5. Run **Actions → Publish calendar → Run workflow** if the push run did not
   start automatically.
6. Verify the page and feed:
   - `https://chaseeasterling.github.io/hideout-comedy-calendar/`
   - `https://chaseeasterling.github.io/hideout-comedy-calendar/hideout-comedy.ics`

## Manual refresh

Use **Actions → Publish calendar → Run workflow** after a known Hideout schedule
change. Apple Calendar controls its own polling interval, so a successful Pages
refresh may not appear on every device immediately.

On Mac, select the subscribed calendar and use **View → Refresh Calendars** to
request an immediate check.

## Failure diagnosis

### Verify job fails

Run `npm run verify` locally. Formatting, lint, type, test, and build failures are
reported separately.

### Live generation fails

Look at the **Generate calendar from live Hideout listings** step. Common causes:

- a Hideout page is temporarily unavailable;
- its markup changed and a parser fixture needs updating;
- the response exceeded the size limit or redirected off `hideouttheatre.com`;
- validation rejected missing dates, duplicate IDs, zero detected shows, or bad
  calendar output.

Do not weaken validation to force a publish. Update the captured fixture, add a
failing parser test, then change the parser. Until a valid run succeeds, GitHub
Pages continues serving the previous artifact.

### Page works but subscription does not update

1. Open the HTTPS feed URL and confirm it downloads current text beginning with
   `BEGIN:VCALENDAR`.
2. Confirm the latest **Publish calendar** workflow is green.
3. On Mac, use **View → Refresh Calendars**.
4. If needed, remove and re-add the subscription using the HTTPS feed URL.

### Scheduled run did not start

GitHub can delay scheduled jobs during load. Use manual dispatch. GitHub may also
disable schedules in repositories with prolonged inactivity; a commit or manual
workflow enablement restores them.
