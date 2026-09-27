import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const defaultBaseUrl =
  'https://chaseeasterling.github.io/hideout-comedy-calendar/';

export interface SiteFiles {
  html: string;
  css: string;
  tokensCss: string;
}

function normalizeBaseUrl(input: string): string {
  const url = new URL(input);
  if (url.protocol !== 'https:') {
    throw new Error('The calendar site URL must use HTTPS');
  }
  url.hash = '';
  url.search = '';
  if (!url.pathname.endsWith('/')) {
    url.pathname += '/';
  }
  return url.toString();
}

export function buildSite(baseUrlInput: string): SiteFiles {
  const baseUrl = normalizeBaseUrl(baseUrlInput);
  const feedUrl = new URL('hideout-comedy.ics', baseUrl).toString();
  const webcalUrl = feedUrl.replace(/^https:/, 'webcal:');

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="Hideout Theatre shows and Sunday Jams in one automatically updating Apple Calendar.">
    <title>Hideout Comedy Calendar</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&amp;family=Plus+Jakarta+Sans:wght@500;600;700;800&amp;display=swap" rel="stylesheet">
    <link rel="stylesheet" href="tokens.css">
    <link rel="stylesheet" href="site.css">
  </head>
  <body>
    <a class="skip-link" href="#main">Skip to calendar setup</a>
    <header class="site-nav" aria-label="Site header">
      <a class="brand" href="${baseUrl}" aria-label="Hideout Comedy Calendar home">
        <span class="brand-mark" aria-hidden="true">H</span>
        <span>Hideout Comedy</span>
      </a>
      <a class="nav-action" href="${webcalUrl}">Subscribe</a>
    </header>

    <main id="main">
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-copy">
          <p class="eyebrow">Austin · shows + Sunday Jams</p>
          <h1 id="hero-title">Hideout, already on your calendar.</h1>
          <p class="lede">One personal feed for what’s happening at The Hideout Theatre. It refreshes automatically—even when your Mac is off.</p>
          <div class="hero-actions">
            <a class="primary-action" href="${webcalUrl}">
              <span>Add to Apple Calendar</span>
              <span aria-hidden="true">↗</span>
            </a>
            <a class="text-link" href="${feedUrl}">Copy or open the HTTPS feed</a>
          </div>
        </div>

        <div class="calendar-mark" aria-hidden="true">
          <span class="calendar-mark__rings"></span>
          <span class="calendar-mark__month">THIS<br>WEEK</span>
          <span class="calendar-mark__line"></span>
          <span class="calendar-mark__footer">SHOWS · JAMS</span>
        </div>
      </section>

      <section class="setup" aria-labelledby="setup-title">
        <div class="section-heading">
          <p class="eyebrow">Set it once</p>
          <h2 id="setup-title">Three small steps. No app to install.</h2>
        </div>

        <ol class="steps">
          <li class="step step--pear">
            <span class="step-number" aria-hidden="true">01</span>
            <div>
              <h3>Tap subscribe on iPhone or iPad</h3>
              <p>Use the green button above, approve the subscription, then tap <strong>Add</strong>. The calendar appears across your Apple devices through iCloud.</p>
            </div>
          </li>
          <li class="step step--cyan">
            <span class="step-number" aria-hidden="true">02</span>
            <div>
              <h3>Or add it on Mac</h3>
              <p>In Calendar, choose <strong>File → New Calendar Subscription</strong>, then paste the HTTPS feed below.</p>
            </div>
          </li>
          <li class="step step--mint">
            <span class="step-number" aria-hidden="true">03</span>
            <div>
              <h3>Let it stay current</h3>
              <p>Apple Calendar checks the feed automatically. GitHub refreshes the Hideout listings every six hours, so your Mac does not need to be running.</p>
            </div>
          </li>
        </ol>

        <div class="feed-box" aria-labelledby="feed-title">
          <div>
            <p class="eyebrow" id="feed-title">Subscription address</p>
            <p class="feed-url">${feedUrl}</p>
          </div>
          <a class="secondary-action" href="${feedUrl}">Open feed</a>
        </div>
      </section>

      <section class="sources" aria-labelledby="sources-title">
        <h2 id="sources-title">Straight from The Hideout</h2>
        <p>This personal calendar combines the official show calendar with the published Sunday Jam rotation.</p>
        <div class="source-links">
          <a href="https://hideouttheatre.com/calendar/">Show calendar <span aria-hidden="true">↗</span></a>
          <a href="https://hideouttheatre.com/austin-improv-classes/sunday-jams/">Sunday Jams <span aria-hidden="true">↗</span></a>
        </div>
      </section>
    </main>

    <footer class="site-footer">
      <p>Less checking.<br><span>More comedy.</span></p>
      <p class="footer-note">A personal calendar built from The Hideout Theatre’s public listings. The Hideout owns its event information; this project simply keeps it handy.</p>
    </footer>
  </body>
</html>
`;

  const tokensCss = `:root {
  --color-cream: oklch(0.97 0.025 89);
  --color-paper: oklch(0.995 0.006 89);
  --color-ink: oklch(0.2 0.03 255);
  --color-ink-muted: oklch(0.42 0.03 255);
  --color-pear: oklch(0.86 0.18 115);
  --color-pear-soft: oklch(0.94 0.09 115);
  --color-cyan: oklch(0.78 0.13 210);
  --color-cyan-soft: oklch(0.94 0.045 210);
  --color-coral: oklch(0.72 0.17 35);
  --color-mint: oklch(0.89 0.1 155);
  --color-accent: oklch(0.86 0.18 115);
  --color-accent-ink: oklch(0.2 0.03 255);

  --font-display: "Plus Jakarta Sans", system-ui, sans-serif;
  --font-body: "Plus Jakarta Sans", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.5rem;
  --space-6: 2rem;
  --space-7: 3rem;
  --space-8: 4rem;
  --space-9: 6rem;

  --text-xs: 0.75rem;
  --text-sm: 0.9rem;
  --text-base: 1rem;
  --text-lg: clamp(1.05rem, 2vw, 1.25rem);
  --text-xl: clamp(1.75rem, 4vw, 3rem);
  --text-display: clamp(3rem, 9vw, 7.5rem);

  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --dur-fast: 140ms;
  --dur-base: 240ms;
  --rule-thin: 2px;
  --rule-heavy: 4px;
  --radius-sm: 0.5rem;
  --radius-md: 1rem;
  --radius-lg: 1.75rem;
  --radius-pill: 999px;
}
`;

  const css = `/* Hallmark · pre-emit critique: P5 H5 E4 S5 R4 V5 · genre: playful · macrostructure: Narrative Workflow · theme: Hum · enrichment: none · nav: N7 · footer: Ft5 · contrast: pass (40–41) · slop: pass (42–45) · honest: pass (46) · chrome: pass (47) · tokens: pass (48) · responsive: pass (49) · icons: pass (30) · mobile: pass (34, 49, 50–57) */
/* Deliberate exception: the tilted calendar mark breaks the grid and keeps the page specific to a live comedy schedule; the sequence stays linear and avoids a generic card dashboard. */
* {
  box-sizing: border-box;
}

html,
body {
  overflow-x: clip;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  color: var(--color-ink);
  background: var(--color-cream);
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: 1.6;
  text-rendering: optimizeLegibility;
}

a {
  color: inherit;
  text-decoration-thickness: 0.12em;
  text-underline-offset: 0.2em;
}

a:hover {
  text-decoration-thickness: 0.18em;
}

a:active {
  text-decoration-thickness: 0.22em;
}

a[aria-disabled="true"] {
  cursor: not-allowed;
  opacity: 0.55;
  pointer-events: none;
}

a:focus-visible {
  outline: var(--rule-heavy) solid var(--color-ink);
  outline-offset: var(--space-1);
}

.skip-link {
  position: fixed;
  z-index: 10;
  top: var(--space-3);
  left: var(--space-3);
  padding: var(--space-3) var(--space-4);
  transform: translateY(-180%);
  border: var(--rule-thin) solid var(--color-ink);
  border-radius: var(--radius-pill);
  background: var(--color-paper);
  font-weight: 800;
}

.skip-link:focus {
  transform: translateY(0);
}

.site-nav {
  min-height: 5.5rem;
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  border-bottom: var(--rule-heavy) solid var(--color-ink);
  background: var(--color-paper);
}

.brand,
.nav-action {
  min-height: 2.75rem;
  display: inline-flex;
  align-items: center;
  font-weight: 800;
  line-height: 1;
  text-decoration: none;
}

.brand {
  gap: var(--space-3);
  padding: var(--space-4) clamp(var(--space-4), 4vw, var(--space-7));
  letter-spacing: -0.02em;
}

.brand-mark {
  width: 2.5rem;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  transform: rotate(-6deg);
  border: var(--rule-thin) solid var(--color-ink);
  border-radius: var(--radius-sm);
  background: var(--color-coral);
  font-family: var(--font-mono);
}

.nav-action {
  justify-content: center;
  padding-inline: clamp(var(--space-5), 5vw, var(--space-8));
  border-left: var(--rule-heavy) solid var(--color-ink);
  color: var(--color-accent-ink);
  background: var(--color-accent);
  transition: background var(--dur-fast) var(--ease-out);
}

.nav-action:hover {
  background: var(--color-cyan);
}

.hero {
  width: min(100%, 90rem);
  min-height: min(49rem, calc(100svh - 5.5rem));
  margin-inline: auto;
  padding-block: clamp(var(--space-7), 6vw, var(--space-8)) clamp(var(--space-8), 8vw, 5.5rem);
  padding-inline: clamp(var(--space-4), 7vw, var(--space-8));
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(17rem, 0.6fr);
  align-items: center;
  gap: clamp(var(--space-7), 8vw, var(--space-9));
}

.hero-copy {
  max-width: 57rem;
}

.eyebrow {
  margin: 0 0 var(--space-4);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

h1,
h2,
h3,
p {
  min-width: 0;
  overflow-wrap: anywhere;
}

h1,
h2,
h3 {
  margin-top: 0;
  line-height: 1.02;
  letter-spacing: -0.055em;
}

h1 {
  max-width: 12ch;
  margin-bottom: var(--space-5);
  font-family: var(--font-display);
  font-size: var(--text-display);
  font-weight: 800;
}

.lede {
  max-width: 60ch;
  margin: 0;
  color: var(--color-ink-muted);
  font-size: var(--text-lg);
}

.hero-actions {
  margin-top: var(--space-7);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-5);
}

.primary-action,
.secondary-action {
  min-height: 3.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-5);
  border: var(--rule-thin) solid var(--color-ink);
  border-radius: var(--radius-pill);
  color: var(--color-accent-ink);
  background: var(--color-accent);
  box-shadow: var(--space-2) var(--space-2) 0 var(--color-ink);
  font-weight: 800;
  line-height: 1;
  text-decoration: none;
  white-space: nowrap;
  transition: transform var(--dur-fast) var(--ease-out);
}

.primary-action:hover,
.secondary-action:hover {
  transform: translate(-0.15rem, -0.15rem);
}

.primary-action:active,
.secondary-action:active {
  transform: translate(var(--space-1), var(--space-1));
}

.text-link {
  min-height: 2.75rem;
  display: inline-flex;
  align-items: center;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

.calendar-mark {
  position: relative;
  width: min(100%, 22rem);
  aspect-ratio: 0.84;
  justify-self: center;
  display: grid;
  grid-template-rows: 1fr auto auto;
  padding: var(--space-7) var(--space-5) var(--space-5);
  transform: rotate(4deg);
  border: var(--rule-heavy) solid var(--color-ink);
  border-radius: var(--radius-lg);
  background: var(--color-paper);
  box-shadow: var(--space-4) var(--space-4) 0 var(--color-coral);
  transition: transform var(--dur-base) var(--ease-out);
}

.calendar-mark:hover {
  transform: rotate(1deg);
}

.calendar-mark__rings {
  position: absolute;
  inset: calc(var(--space-3) * -1) var(--space-6) auto;
  height: var(--space-5);
  border-block: var(--rule-heavy) solid var(--color-ink);
}

.calendar-mark__month {
  align-self: center;
  font-size: clamp(3rem, 8vw, 5.6rem);
  font-weight: 800;
  line-height: 0.82;
  letter-spacing: -0.08em;
}

.calendar-mark__line {
  height: var(--rule-heavy);
  background: var(--color-ink);
}

.calendar-mark__footer {
  padding-top: var(--space-3);
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.08em;
}

.setup {
  border-block: var(--rule-heavy) solid var(--color-ink);
  background: var(--color-paper);
}

.section-heading,
.steps,
.feed-box,
.sources {
  width: min(calc(100% - 2rem), 74rem);
  margin-inline: auto;
}

.section-heading {
  padding-block: var(--space-8) var(--space-6);
}

.section-heading h2,
.sources h2 {
  max-width: 16ch;
  margin-bottom: 0;
  font-size: var(--text-xl);
  font-weight: 800;
}

.steps {
  margin-block: 0;
  padding: 0;
  list-style: none;
  border-top: var(--rule-thin) solid var(--color-ink);
}

.step {
  display: grid;
  grid-template-columns: minmax(4.5rem, 0.25fr) minmax(0, 1fr);
  gap: var(--space-5);
  padding: clamp(var(--space-5), 5vw, var(--space-7));
  border-inline: var(--rule-thin) solid var(--color-ink);
  border-bottom: var(--rule-thin) solid var(--color-ink);
}

.step--pear {
  background: var(--color-paper);
}

.step--pear .step-number {
  background: var(--color-pear);
}

.step--cyan {
  background: var(--color-paper);
}

.step--cyan .step-number {
  background: var(--color-cyan);
}

.step--mint {
  background: var(--color-paper);
}

.step--mint .step-number {
  background: var(--color-mint);
}

.step-number {
  width: 3.25rem;
  height: 3.25rem;
  display: grid;
  place-items: center;
  border: var(--rule-thin) solid var(--color-ink);
  border-radius: var(--radius-pill);
  font-family: var(--font-body);
  font-size: var(--text-lg);
  font-weight: 700;
}

.step h3 {
  margin-bottom: var(--space-3);
  font-size: var(--text-lg);
  font-weight: 800;
  letter-spacing: -0.03em;
}

.step p {
  max-width: 68ch;
  margin: 0;
  color: var(--color-ink-muted);
}

.feed-box {
  margin-block: var(--space-7) var(--space-8);
  padding: var(--space-5);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-5);
  border: var(--rule-thin) solid var(--color-ink);
  border-radius: var(--radius-lg);
  background: var(--color-cream);
}

.feed-box .eyebrow {
  margin-bottom: var(--space-2);
}

.feed-url {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  word-break: break-all;
}

.secondary-action {
  flex: 0 0 auto;
  background: var(--color-cyan);
}

.sources {
  padding-block: var(--space-9);
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
  gap: var(--space-7);
}

.sources > p {
  max-width: 35rem;
  margin: 0;
  color: var(--color-ink-muted);
  font-size: var(--text-lg);
}

.source-links {
  grid-column: 2;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
}

.source-links a {
  min-height: 2.75rem;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
}

.site-footer {
  padding: clamp(var(--space-7), 8vw, var(--space-9)) clamp(var(--space-4), 7vw, var(--space-8));
  display: grid;
  grid-template-columns: 1.4fr 0.6fr;
  align-items: end;
  gap: var(--space-7);
  border-top: var(--rule-heavy) solid var(--color-ink);
  background: var(--color-ink);
  color: var(--color-cream);
}

.site-footer > p:first-child {
  margin: 0;
  font-size: clamp(3rem, 9vw, 8rem);
  font-weight: 800;
  line-height: 0.85;
  letter-spacing: -0.07em;
}

.site-footer > p:first-child span {
  color: var(--color-pear);
}

.footer-note {
  max-width: 50ch;
  margin: 0;
  color: var(--color-cream);
  font-size: var(--text-sm);
}

@media (max-width: 52rem) {
  .hero {
    min-height: auto;
    grid-template-columns: 1fr;
  }

  .calendar-mark {
    width: min(72vw, 19rem);
    justify-self: start;
    margin-left: clamp(var(--space-4), 14vw, var(--space-9));
  }

  .sources,
  .site-footer {
    grid-template-columns: 1fr;
  }

  .source-links {
    grid-column: auto;
  }
}

@media (max-width: 36rem) {
  .site-nav {
    min-height: 4.75rem;
  }

  .brand {
    padding-inline: var(--space-4);
  }

  .brand-mark {
    display: none;
  }

  .nav-action {
    padding-inline: var(--space-4);
  }

  .hero-actions,
  .feed-box {
    align-items: stretch;
    flex-direction: column;
  }

  .primary-action,
  .secondary-action {
    width: 100%;
  }

  .step {
    grid-template-columns: 1fr;
    gap: var(--space-3);
  }
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }

  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
`;

  return { html, css, tokensCss };
}

async function main(): Promise<void> {
  const outputDirectory = path.resolve(process.argv[2] ?? 'public');
  const site = buildSite(process.env.CALENDAR_BASE_URL ?? defaultBaseUrl);

  await mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    writeFile(path.join(outputDirectory, 'index.html'), site.html, 'utf8'),
    writeFile(path.join(outputDirectory, 'site.css'), site.css, 'utf8'),
    writeFile(path.join(outputDirectory, 'tokens.css'), site.tokensCss, 'utf8'),
  ]);

  process.stdout.write(`Wrote subscription site to ${outputDirectory}\n`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main();
}
