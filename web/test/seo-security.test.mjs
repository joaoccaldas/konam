import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pages = fs.readdirSync(root).filter(f => f.endsWith('.html'));

test('every published page carries security, privacy and SEO metadata', () => {
  assert.ok(pages.length >= 8);
  for (const f of pages) {
    const h = fs.readFileSync(path.join(root, f), 'utf8');
    assert.match(h, /http-equiv="Content-Security-Policy" content="default-src 'self'/, f);
    assert.match(h, /object-src 'none'/, f);
    assert.match(h, /name="referrer" content="strict-origin-when-cross-origin"/, f);
    assert.match(h, /rel="canonical" href="https:\/\/(?:konam\.vercel\.app|joaoccaldas\.github\.io\/canyonmuseum)\//, f);
    assert.match(h, /<meta name="description" content="[^"]{60,}"/, f);
    assert.match(h, /property="og:image" content="https:\/\/[^"]+\.jpg"/, f);
    const ld = h.match(/<script type="application\/ld\+json">([^<]+)<\/script>/);
    assert.ok(ld, f); const o = JSON.parse(ld[1]); assert.equal(o['@context'], 'https://schema.org'); assert.match(o.disambiguatingDescription, /Not affiliated/);
    assert.doesNotMatch(h, /\/Users\/[a-z]+|@gmail\.com/, f);
  }
});

test('crawler files exist and point at the public site', () => {
  const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
  assert.match(robots, /User-agent: OAI-SearchBot[\s\S]*Allow: \/+/);
  assert.match(robots, /Sitemap: https:\/\/(?:konam\.vercel\.app|joaoccaldas\.github\.io\/canyonmuseum)\/sitemap\.xml/);
  assert.match(fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8'), /<loc>https:\/\/(?:konam\.vercel\.app|joaoccaldas\.github\.io\/canyonmuseum)\/<\/loc>/);
  const llms = fs.readFileSync(path.join(root, 'llms.txt'), 'utf8');
  assert.match(llms, /Not affiliated/); assert.match(llms, /No accounts, no analytics/);
  assert.doesNotMatch(llms, /Anne Haug/);                        // she won on a Cervélo: facts come from kona_champions.json
  const full = fs.readFileSync(path.join(root, 'llms-full.txt'), 'utf8');
  assert.match(full, /Rooms and exhibits/);
  assert.match(full, /Hawaiʻi Island \/ Kona guide/);
  assert.match(full, /Evidence model/);
});

test('deploy publishes an allowlist and runs a leak guard', () => {
  const wf = fs.readFileSync(path.join(root, '.github/workflows/pages.yml'), 'utf8') + fs.readFileSync(path.join(root, 'tools/stage_site.sh'), 'utf8');
  assert.doesNotMatch(wf, /rsync -a \.\/ _site\//);              // never the whole repository
  assert.match(wf, /--exclude reference\//);                      // saved third-party pages stay private
  assert.match(wf, /Leak guard/);
  assert.match(wf, /llms-full\.txt/);
});

test('hardener defaults to the Kona.m Vercel public surface', () => {
  const hardener = fs.readFileSync(path.join(root, 'tools/harden_pages.mjs'), 'utf8');
  assert.match(hardener, /VERCEL_PROJECT_PRODUCTION_URL/);
  assert.match(hardener, /https:\/\/konam\.vercel\.app\//);
  assert.doesNotMatch(hardener, /const SITE = 'https:\/\/joaoccaldas\.github\.io\/canyonmuseum\/'/);
});
