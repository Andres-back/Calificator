import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const publicDir = resolve(process.cwd(), 'public');
const indexPath = resolve(process.cwd(), 'index.html');
const nginxTemplatePath = resolve(process.cwd(), '../nginx/templates/default.conf.template');

function pngSize(name: string) {
  const bytes = readFileSync(resolve(publicDir, name));
  expect(bytes.subarray(1, 4).toString()).toBe('PNG');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

describe('public SEO identity assets', () => {
  it('ships every declared same-origin identity resource with the expected dimensions', () => {
    const expected = {
      'favicon.ico': null,
      'favicon.svg': null,
      'favicon-48x48.png': { width: 48, height: 48 },
      'apple-touch-icon.png': { width: 180, height: 180 },
      'icon-192.png': { width: 192, height: 192 },
      'icon-512.png': { width: 512, height: 512 },
      'og-xcalificator.png': { width: 1200, height: 630 },
      'site.webmanifest': null,
      'robots.txt': null,
      'sitemap.xml': null,
    } as const;

    for (const [name, dimensions] of Object.entries(expected)) {
      expect(existsSync(resolve(publicDir, name)), `${name} debe existir`).toBe(true);
      if (dimensions) expect(pngSize(name)).toEqual(dimensions);
    }
  });

  it('declares an installable identity without offline behavior', () => {
    const manifest = JSON.parse(readFileSync(resolve(publicDir, 'site.webmanifest'), 'utf8')) as {
      name: string;
      short_name: string;
      start_url: string;
      scope: string;
      icons: Array<{ src: string; sizes: string }>;
      serviceworker?: unknown;
    };

    expect(manifest.name).toBe('XCalificator');
    expect(manifest.short_name).toBe('XCalificator');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.icons.map((icon) => icon.sizes)).toEqual(['192x192', '512x512']);
    expect(manifest).not.toHaveProperty('serviceworker');
  });

  it('indexes only the canonical landing page', () => {
    const robots = readFileSync(resolve(publicDir, 'robots.txt'), 'utf8');
    const sitemap = readFileSync(resolve(publicDir, 'sitemap.xml'), 'utf8');

    expect(robots).toContain('Allow: /');
    expect(robots).toContain('Sitemap: https://xcalificator.daimuz.com/sitemap.xml');
    expect(robots).not.toMatch(/Disallow:\s*\/(?:app|login|registro)/);
    expect(sitemap.match(/<loc>/g)).toHaveLength(1);
    expect(sitemap).toContain('<loc>https://xcalificator.daimuz.com/</loc>');
    expect(sitemap).not.toContain('/app');
  });

  it('keeps complete static metadata in the initial HTML for non-JavaScript crawlers', () => {
    const html = readFileSync(indexPath, 'utf8');

    for (const required of [
      'name="description"',
      'name="robots" content="index, follow"',
      'rel="canonical" href="https://xcalificator.daimuz.com/"',
      'property="og:title"',
      'property="og:description"',
      'property="og:url"',
      'property="og:image"',
      'name="twitter:card"',
      'rel="manifest"',
      'rel="apple-touch-icon"',
    ]) {
      expect(html).toContain(required);
    }
  });

  it('keeps private routes noindex after the Nginx SPA fallback', () => {
    const nginx = readFileSync(nginxTemplatePath, 'utf8');

    expect(nginx).toContain('map $request_uri $xcalificator_robots_tag');
    expect(nginx).toContain('default "noindex, nofollow";');
    expect(nginx).toContain('~^/(?:\\?|$) "";');
    expect(nginx).toMatch(/~\^\/app.*"noindex, nofollow"/);
    expect(nginx).toContain('add_header X-Robots-Tag $xcalificator_robots_tag always;');
    expect(nginx).toContain('default_type application/manifest+json;');
  });
});
