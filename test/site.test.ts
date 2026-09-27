import { load } from 'cheerio';
import { describe, expect, it } from 'vitest';

import { buildSite } from '../scripts/build-site.js';

const baseUrl = 'https://chaseeasterling.github.io/hideout-comedy-calendar/';

describe('buildSite', () => {
  it('builds a semantic Apple Calendar subscription page', () => {
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
    expect($('body').text()).toContain('Hideout Comedy');
    expect($(`a[href="${feedUrl}"]`)).not.toHaveLength(0);
    expect($(`a[href="${webcalUrl}"]`)).not.toHaveLength(0);
    expect($('body').text()).toMatch(/iPhone|iPad/);
    expect($('body').text()).toContain('Mac');
    expect(site.css).toContain('Hallmark');
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
