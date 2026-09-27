import { load } from 'cheerio';
import { describe, expect, it } from 'vitest';

import { buildSite, DEFAULT_BASE_URL } from '../scripts/build-site.js';

const baseUrl = 'https://slowspeedchase.github.io/hideout-comedy-calendar/';

describe('buildSite', () => {
  it('defaults to the public SlowSpeedChase Pages project', () => {
    expect(DEFAULT_BASE_URL).toBe(baseUrl);
  });

  it('builds a minimal Apple Calendar subscription page', () => {
    const site = buildSite(baseUrl);
    const $ = load(site.html);
    const feedUrl = `${baseUrl}hideout-comedy.ics`;
    const webcalUrl = feedUrl.replace(/^https:/, 'webcal:');

    expect($('html').attr('lang')).toBe('en');
    expect($('meta[name=viewport]').attr('content')).toContain(
      'width=device-width',
    );
    expect($('main')).toHaveLength(1);
    expect($('h1')).toHaveLength(1);
    expect($('h1').text()).toBe('Hideout Comedy');
    expect($('body').text()).toContain('Shows + Sunday Jams');
    expect($(`a[href="${feedUrl}"]`)).not.toHaveLength(0);
    expect($(`a[href="${webcalUrl}"]`)).not.toHaveLength(0);
    expect($('body a')).toHaveLength(2);
    expect($('header, nav, section, footer, ol, h2, h3')).toHaveLength(0);
    expect($('link[href*="fonts.googleapis.com"]')).toHaveLength(0);
    expect(site.css).toContain('Hallmark');
    expect(site.css).toContain(':focus-visible');
    expect(site.css).toContain('[aria-disabled="true"]');
    expect(site.tokensCss).toContain('--color-ink');
  });

  it('normalizes the Pages base URL before creating links', () => {
    const site = buildSite(baseUrl.slice(0, -1));

    expect(site.html).toContain(`${baseUrl}hideout-comedy.ics`);
    expect(site.html).not.toContain(
      'hideout-comedy-calendarhideout-comedy.ics',
    );
  });
});
