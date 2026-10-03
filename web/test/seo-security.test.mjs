import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pages = fs.readdirSync(root).filter(f => f.endsWith('.html'));
// Owner-declared public contacts (config/privacy-exceptions.json) are the only permitted addresses.
const declared = JSON.parse(fs.readFileSync(path.join(root, 'config/privacy-exceptions.json'), 'utf8')).exceptions.filter(e => e.kind === 'personal-email');

test('every published page carries security, privacy and SEO metadata', () => {
  assert.ok(pages.length >= 8);
  for (const f of pages) {
    const h = fs.readFileSync(path.join(root, f), 'utf8');
    assert.match(h, /http-equiv="Content-Security-Policy" content="default-src 'self'/, f);
    assert.match(h, /object-src 'none'/, f);
    assert.match(h, /name="referrer" content="strict-origin-when-cross-origin"/, f);
    assert.match(h, /rel="canonical" href="https:\/\/(?:konam\.vercel\.app|joaoccaldas\.github\.io\/konam)\//, f);
    assert.match(h, /<meta name="description" content="[^"]{60,}"/, f);
    assert.match(h, /property="og:image" content="https:\/\/[^"]+\.(?:jpg|png)"/, f);
    const image=h.match(/property="og:image" content="([^"]+)"/)[1];
    assert.ok(fs.existsSync(path.join(root,new URL(image).pathname.replace(/^\/konam\//,''))),f+' social image exists');
    const ld = h.match(/<script type="application\/ld\+json">([^<]+)<\/script>/);
    assert.ok(ld, f);
    const o = JSON.parse(ld[1]);
    assert.equal(o['@context'], 'https://schema.org');
    assert.ok(Array.isArray(o['@graph']), f+' structured data graph');
    const website=o['@graph'].find(x=>x['@type']==='WebSite');
    const org=o['@graph'].find(x=>x['@type']==='Organization');
    const page=o['@graph'].find(x=>x.url && x['@type']!=='WebSite' && x['@type']!=='Organization');
    assert.equal(website?.name,'Kona.m',f+' website identity');
    assert.equal(org?.name,'Kona.m',f+' organization identity');
    assert.match(page?.disambiguatingDescription||'',/Not affiliated/,f+' independence disclosure');
    assert.ok(page?.about?.some?.(x=>x.name==='Triathlon'),f+' triathlon semantic');
    assert.ok(page?.about?.some?.(x=>x.name==='IRONMAN World Championship'),f+' IRONMAN semantic');
    const visible = declared.filter(e => e.file === f).reduce((s, e) => s.replaceAll(e.value, 'declared-contact'), h.replace(/&#64;|&#x40;|&commat;/gi, '@'));
    assert.doesNotMatch(visible, /<meta\s+[^>]*name=["']author["']|\/Users\/[a-z]+|@gmail\.com|Jo[aã]o\s+Caldas/i, f);
  }
});

test('crawler files exist and point at the public site', () => {
  const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
  assert.match(robots, /User-agent: OAI-SearchBot[\s\S]*Allow: \/+/);
  assert.match(robots, /Sitemap: https:\/\/(?:konam\.vercel\.app|joaoccaldas\.github\.io\/konam)\/sitemap\.xml/);
  assert.match(fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8'), /<loc>https:\/\/(?:konam\.vercel\.app|joaoccaldas\.github\.io\/konam)\/<\/loc>/);
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
  assert.match(wf, /scan_public_surface\.mjs/);
  assert.match(wf, /llms-full\.txt/);
});

test('hardener uses the canonical Kona.m origin and supports a Vercel override', () => {
  const hardener = fs.readFileSync(path.join(root, 'tools/harden_pages.mjs'), 'utf8');
  assert.match(hardener, /VERCEL_PROJECT_PRODUCTION_URL/);
  assert.match(hardener, /productMeta\.canonical_site/);
  const meta = JSON.parse(fs.readFileSync(path.join(root, 'config/product-meta.json'), 'utf8'));
  assert.equal(meta.canonical_site, 'https://joaoccaldas.github.io/konam/');
  assert.doesNotMatch(hardener, /const SITE = 'https:\/\/joaoccaldas\.github\.io\/konam\/'/);
});


test('global launch SEO is people-first and does not fake localized alternates', () => {
  const landing=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.match(landing,/Kona triathlon/i);
  assert.match(landing,/IRONMAN(?:®| World Championship)/i);
  assert.match(landing,/Brazil/i);
  assert.match(landing,/Sweden/i);
  assert.match(landing,/Dubai/i);
  assert.doesNotMatch(landing,/hreflang=/i);
  const locale=JSON.parse(fs.readFileSync(path.join(root,'config/launch-language-v1.json'),'utf8'));
  assert.equal(locale.default_locale,'en');
  assert.equal(locale.locales.find(x=>x.id==='pt-BR')?.status,'next');
});
