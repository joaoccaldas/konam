// Post-build hardening for every published page: security policy, privacy, SEO, social cards,
// structured data (schema.org JSON-LD) and machine-readable summaries for search and LLM crawlers.
// Config-driven: a new room (athlete, brand, event) is one entry in PAGES. Idempotent: re-running replaces the block.
//   node tools/harden_pages.mjs
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const SITE = 'https://joaoccaldas.github.io/canyonmuseum/';
const NAME = 'KONA';
const DISCLAIMER = 'An independent, unofficial fan and research project. Not affiliated with, endorsed by or sponsored by Canyon Bicycles GmbH. Canyon and Speedmax are trademarks of their owners.';

// The only third parties the pages load (measured with a request log): Google Fonts and Wikimedia images.
const CSP_BASE = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",       // hall and studio load app/*.js; meshopt decoder is WebAssembly
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://upload.wikimedia.org https://thumb.wikimedia.org",
  "connect-src 'self' data: blob: https://api.weather.gov https://mtvpnoqwjpoqaiocrklq.supabase.co https://upload.wikimedia.org https://thumb.wikimedia.org",
  "media-src 'self' data: blob:",
  "worker-src 'self' blob:",
  "object-src 'none'", "base-uri 'self'", "form-action 'none'",
];
const cspFor=file=>CSP_BASE.map(x=>x.startsWith("script-src ")?(file==='index.html'?"script-src 'self' 'wasm-unsafe-eval'":x):x).join('; ');

const PAGES = [
  { file: 'index.html', type: 'SoftwareApplication', image: 'assets/share/museum.jpg',
    title: 'KONA · Race the version of yourself',
    description: 'Build your race identity, prepare for race week, explore triathlon machines, people, places and stories, and enter the immersive 3D world when you choose.' },
  { file: 'Canyon_Collection.html', type: 'CollectionPage', image: 'assets/share/collection.jpg',
    title: 'Canyon Triathlon Collection · every Speedmax generation, compared',
    description: 'Every Canyon Speedmax generation on record, 1999–2027: interactive 3D exhibits, side-by-side specifications, an aero calculator and a sourced archive of the bikes that were never modelled.' },
  { file: 'Studio.html', type: 'WebApplication', image: 'assets/share/museum.jpg',
    title: 'Studio · Speedmax Museum — build, paint and share a time-trial bike',
    description: 'Every bike in the Speedmax Museum and more, in 3D: paint it, give it a film theme, set the scene, dream it in motion and share it. Canyon generations, named machines and studio designs.', keepTitle: true },
  { file: 'Experiences.html', type: 'WebPage', image: 'assets/share/museum.jpg',
    title: 'Speedmax Nights & History Lane · Canyon Speedmax Museum',
    description: 'Three night experiences around one Canyon Speedmax (Lava Night, Camp 13 and the Ghost Tunnel) and History Lane, the story from Koblenz in 1985 to Kona. An independent study.', keepTitle: true },
];
for (const f of fs.readdirSync(root).filter(f => /^Speedmax_.*_?Museum\.html$/.test(f))) {
  const html = fs.readFileSync(path.join(root, f), 'utf8');
  const t = html.match(/<title>([^<]*)<\/title>/)?.[1] || f;
  const d = html.match(/<meta name="description" content="([^"]*)"/)?.[1] || '';
  PAGES.push({ file: f, type: 'WebPage', image: 'assets/share/museum.jpg', title: t, description: d, keepTitle: true });
}

const COMMON_DESIGN_LINKS = [
  'brand/tokens.css',
  'brand/themes.css',
  'brand/artifacts.css',
  'brand/typography.css',
  'web/styles/system.css',
  'web/styles/components.css',
];
const pageDesignLinks = file => file === 'index.html'
  ? [...COMMON_DESIGN_LINKS, 'web/styles/shell-mobile.css', 'web/styles/entry.css']
  : COMMON_DESIGN_LINKS;
const FONTS = 'https://fonts.googleapis.com/css2?family=Caveat:wght@500;600&family=Instrument+Serif:ital@0;1&family=Manrope:wght@300..800&display=swap';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const jsonld = o => JSON.stringify(o).replace(/</g, '\\u003c');
const GLOBAL_USER_STUDIO = '<!--global-user-studio:start--><a class="global-user-studio" href="index.html?view=me" aria-label="Open User Studio">USER STUDIO</a><!--global-user-studio:end-->';

function block(p) {
  const url = SITE + (p.file === 'index.html' ? '' : p.file), img = SITE + p.image;
  const ld = {
    '@context': 'https://schema.org', '@type': p.type, name: p.title, description: p.description, url, image: img, inLanguage: 'en',
    isAccessibleForFree: true, publisher: { '@type': 'Person', name: 'João Caldas', url: 'https://joaoccaldas.github.io/ai/' },
    about: [{ '@type': 'Thing', name: 'Canyon Speedmax' }, { '@type': 'SportsEvent', name: 'IRONMAN World Championship', location: 'Kailua-Kona, Hawaii' }],
    disambiguatingDescription: DISCLAIMER,
  };
  return `<!--harden:start-->
<meta http-equiv="Content-Security-Policy" content="${cspFor(p.file)}">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website"><meta property="og:site_name" content="${NAME}">
<meta property="og:title" content="${esc(p.title)}"><meta property="og:description" content="${esc(p.description)}">
<meta property="og:url" content="${url}"><meta property="og:image" content="${img}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(p.title)}"><meta name="twitter:description" content="${esc(p.description)}"><meta name="twitter:image" content="${img}">
<link rel="alternate" type="text/plain" href="${SITE}llms.txt" title="LLM summary">
<script type="application/ld+json">${jsonld(ld)}</script>
<!--harden:end-->`;
}

for (const p of PAGES) {
  const f = path.join(root, p.file); if (!fs.existsSync(f)) continue;
  let html = fs.readFileSync(f, 'utf8').replace(/<!--harden:start-->[\s\S]*?<!--harden:end-->\n?/, '');
  if (!p.keepTitle) html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(p.title)}</title>`);
  if (/<meta name="description"/.test(html)) html = html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(p.description)}">`);
  else html = html.replace(/<\/title>/, `</title>\n<meta name="description" content="${esc(p.description)}">`);
  html = html.replace(/<meta charset="utf-8">/i, m => `${m}\n${block(p)}`);
  if (!html.includes('<!--harden:start-->')) throw new Error('no <meta charset> in ' + p.file);
  // The hardener may add missing shared links, but never duplicates page-owned CSS.
  // shell-mobile and race-self belong only to the consumer app, not standalone Studio/Collection/Experiences.
  html = html.replace(/<!--design-system:start-->[\s\S]*?<!--design-system:end-->\n?/, '');
  html = html.replace(/<link[^>]+href="https:\/\/fonts\.googleapis\.com\/css2\?[^"]+"[^>]*>\n?/g,'');
  const fonts = `<link rel="stylesheet" href="${FONTS}">`;
  const missing = pageDesignLinks(p.file).filter(href => !html.includes(`href="${href}"`))
    .map(href => `<link rel="stylesheet" href="${href}">`).join('');
  html = html.replace(/<\/head>/i, `<!--design-system:start-->${fonts}${missing}<!--design-system:end-->\n</head>`);
  html = html.replace(/<!--global-user-studio:start-->[\s\S]*?<!--global-user-studio:end-->\n?/g, '');
  if (p.file !== 'index.html' && !html.includes('href="index.html?view=me"')) {
    html = html.replace(/<body([^>]*)>/i, match => match + GLOBAL_USER_STUDIO);
  }
  fs.writeFileSync(f, html);
}

const CHAMPS = JSON.parse(fs.readFileSync(path.join(root, 'museum/kona_champions.json'), 'utf8')).titles.map(t => `${t.year} ${t.athlete} (${t.bike})`).join('; ');
const brandFile = path.join(root, 'museum/world/brand_rooms.json');
const BRANDS = fs.existsSync(brandFile) ? JSON.parse(fs.readFileSync(brandFile, 'utf8')).rooms.flatMap(r => (r.products || []).map(p => `${p.brand} ${p.model} in ${r.name} (${p.legal || 'independent study'})`)) : [];
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES.map(p => `  <url><loc>${SITE}${p.file === 'index.html' ? '' : p.file}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`);
fs.writeFileSync(path.join(root, 'robots.txt'), `User-agent: OAI-SearchBot
Allow: /

User-agent: *
Allow: /
Sitemap: ${SITE}sitemap.xml
`);
fs.writeFileSync(path.join(root, 'llms.txt'), `# ${NAME}

> ${PAGES[0].description}

${DISCLAIMER}

## Pages
${PAGES.map(p => `- [${p.title}](${SITE}${p.file === 'index.html' ? '' : p.file}): ${p.description}`).join('\n')}

## Facts and sources
- Bikes are unofficial procedural Blender reconstructions calibrated against published photographs and geometry; each exhibit lists its sources and known uncertainties.
- Kona titles on a Speedmax (from museum/kona_champions.json): ${CHAMPS}.
${BRANDS.length ? `- Brand-room studies: ${BRANDS.join('; ')}.` : ''}
- Photographs are openly licensed (Wikimedia Commons, CC BY / CC BY-SA); authors and licences are shown beside every image.

## Privacy
No accounts, no analytics, no cookies, no tracking by default. The Passport and settings stay in the visitor's own browser (localStorage). An optional email sign-in can back that data up only when the visitor asks.
`);
const roomsMd = fs.existsSync(path.join(root, 'docs/ROOMS.md')) ? fs.readFileSync(path.join(root, 'docs/ROOMS.md'), 'utf8') : '';
const islandGuide = fs.existsSync(path.join(root, 'museum/kona/island-guide.json')) ? JSON.parse(fs.readFileSync(path.join(root, 'museum/kona/island-guide.json'), 'utf8')) : null;
const guideLines = islandGuide ? [
  `Race context: ${islandGuide.race_2026.event} · ${islandGuide.race_2026.date} · ${islandGuide.race_2026.location}`,
  `Population context: ${islandGuide.population.geography} · ${islandGuide.population.population.toLocaleString('en-US')} · estimate ${islandGuide.population.estimate_date}`,
  '',
  'Visitor places:',
  ...islandGuide.places.map(p => `- ${p.name} · ${p.region} · ${p.categories.join(', ')} · source: ${p.source}`),
  '',
  'Editorial stories:',
  ...islandGuide.stories.map(x => `- ${x.title}: ${x.summary} · source: ${x.source}`)
].join('\n') : 'Kona island guide not built yet.';

fs.writeFileSync(path.join(root, 'llms-full.txt'), `# ${NAME} — full machine-readable guide

${DISCLAIMER}

This file is generated from the same museum registries used by the public app. Stable ids in the JSON/data files are preferred over names for programmatic references.

## Public pages
${PAGES.map(p => `- ${p.title}: ${SITE}${p.file === 'index.html' ? '' : p.file}`).join('\n')}

## Evidence model
P = published source. F = visible/read from a reference photograph. I = inferred for the model. G = generated artwork. Generated or inferred material is not presented as published fact.

## Rooms and exhibits
${roomsMd}

## Hawaiʻi Island / Kona guide
${guideLines}

## Privacy and app behavior
No account is required. No default analytics, ad trackers or background location tracking. Profile, Passport, finds and saved app state are local-first unless a future sync feature is explicitly enabled by the visitor.
`);

console.log('hardened', PAGES.map(p => p.file).join(', '));
