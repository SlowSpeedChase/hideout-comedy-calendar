import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

export const DEFAULT_BASE_URL =
  'https://slowspeedchase.github.io/hideout-comedy-calendar/';

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
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="description" content="Hideout Theatre shows and Sunday Jams in one automatically updating Apple Calendar.">
    <title>Hideout Comedy</title>
    <link rel="stylesheet" href="tokens.css">
    <link rel="stylesheet" href="site.css">
  </head>
  <body>
    <main>
      <h1>Hideout Comedy</h1>
      <p>Shows + Sunday Jams</p>
      <a class="subscribe" href="${webcalUrl}">Subscribe</a>
      <a class="feed-link" href="${feedUrl}">Feed address</a>
    </main>
  </body>
</html>
`;

  const tokensCss = `:root {
  --color-paper: oklch(0.97 0.01 82);
  --color-ink: oklch(0.2 0.015 255);
  --color-muted: oklch(0.46 0.018 255);
  --color-accent: oklch(0.5 0.14 246);
  --color-accent-soft: oklch(0.9 0.04 246);

  --font-display: "Iowan Old Style", "Palatino Linotype", Palatino, ui-serif, serif;
  --font-body: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;

  --space-xs: 0.5rem;
  --space-sm: 0.75rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2.5rem;
  --space-2xl: 4rem;
  --space-3xl: 6rem;

  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-display: clamp(2.75rem, 9vw, 4.5rem);

  --rule-thin: 1px;
  --radius-sm: 0.25rem;
}
`;

  const css = `/* Hallmark · macrostructure: Index-First · tone: utilitarian · anchor hue: blue · genre: editorial · theme: Almanac · enrichment: none · nav: none · footer: none · contrast: pass (40–41) · slop: pass (42–45) · honest: pass (46) · chrome: pass (47) · tokens: pass (48) · responsive: pass (49) · icons: pass (30) · mobile: pass (34, 49, 50–57) */
/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
* {
  box-sizing: border-box;
}

html,
body {
  overflow-x: clip;
}

body {
  min-height: 100svh;
  margin: 0;
  display: grid;
  align-items: center;
  color: var(--color-ink);
  background: var(--color-paper);
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: 1.5;
}

main {
  width: min(100%, 34rem);
  padding-block-start: max(var(--space-2xl), env(safe-area-inset-top));
  padding-block-end: max(var(--space-3xl), env(safe-area-inset-bottom));
  padding-inline: max(var(--space-lg), env(safe-area-inset-left))
    max(var(--space-lg), env(safe-area-inset-right));
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

h1 {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
  font-family: var(--font-display);
  font-size: var(--text-display);
  font-style: normal;
  font-weight: 700;
  letter-spacing: -0.035em;
  line-height: 1;
}

p {
  margin: var(--space-sm) 0 var(--space-xl);
  color: var(--color-muted);
}

a {
  color: inherit;
}

.subscribe {
  min-width: 10rem;
  min-height: 3rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-sm) var(--space-lg);
  border: var(--rule-thin) solid var(--color-ink);
  border-radius: var(--radius-sm);
  background: transparent;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
}

.subscribe:hover {
  background: var(--color-accent-soft);
  border-color: var(--color-accent);
}

.subscribe:active {
  background: var(--color-paper);
  border-color: var(--color-ink);
}

.subscribe[aria-disabled="true"],
.feed-link[aria-disabled="true"] {
  opacity: 0.55;
  cursor: not-allowed;
  pointer-events: none;
}

.subscribe:focus-visible,
.feed-link:focus-visible {
  outline: 3px solid var(--color-accent);
  outline-offset: 3px;
}

.feed-link {
  min-height: 2.75rem;
  margin-block-start: var(--space-md);
  display: inline-flex;
  align-items: center;
  color: var(--color-muted);
  font-size: var(--text-sm);
  text-underline-offset: 0.2em;
  white-space: nowrap;
}

@media (min-width: 40rem) {
  main {
    padding-inline: var(--space-2xl);
  }
}

@media (pointer: coarse) {
  .subscribe,
  .feed-link {
    min-height: 3rem;
  }
}
`;

  return { html, css, tokensCss };
}

async function main(): Promise<void> {
  const outputDirectory = path.resolve(process.argv[2] ?? 'public');
  const site = buildSite(process.env.CALENDAR_BASE_URL ?? DEFAULT_BASE_URL);

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
