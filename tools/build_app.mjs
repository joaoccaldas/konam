#!/usr/bin/env node
// tools/build_app.mjs — seal a release of the installable museum.
//
// Hashes every file the app can load (SHA-256, base64), writes app/app-manifest.json and
// generates sw.js from web/sw.template.js with the manifest inlined. Any change to any file
// changes sw.js, which is how installed apps learn there is an update; the worker then
// verifies every file against these hashes before the update goes live.
//
//   node tools/build_app.mjs        (from the repo root, after web/build_landing.mjs)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const rel = f => path.relative(root, f).split(path.sep).join('/');
const walk = d => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]) : [];

// core: needed to open the app offline. Everything else is verified and cached on first use.
const core = ['index.html', 'app/viewport.js', 'app/kona-core.js', 'app/entry-data.json', 'integrations/public-catalog.json', 'manifest.webmanifest', 'web/styles/entry.css', 'web/styles/system.css', 'web/styles/shell-mobile.css', 'web/styles/home.css', 'web/styles/garage.css', 'web/styles/race-self.css', 'web/styles/companion.css', 'web/styles/admin-assets.css', 'brand/tokens.css', 'brand/themes.css', 'brand/artifacts.css', 'brand/typography.css', 'web/styles/components.css', 'assets/pwa/icon-v3.svg', 'assets/pwa/icon-v3-192.png', 'assets/pwa/icon-v3-512.png', 'assets/pwa/icon-v3-maskable-512.png', 'assets/pwa/apple-touch-icon-v3.png'];
const lazy = ['integrations/companion/feed.json','integrations/companion/rss.xml','integrations/companion/travel.json',
  'app/world-shell.html', 'app/admin-assets.json', 'app/admin-asset-preview.js', 'web/styles/hall-web.css', 'web/styles/hall-mobile.css', 'web/styles/studio.css', 'web/styles/experience.css', 'web/styles/collection.css', 'app/race-self-stage.js', 'app/collectible-stage.js', 'integrations/ironman-races-2016-2026.json', 'app/museum-data.js', 'app/hall.js', 'app/studio.js', 'app/studio-catalog.js',
  ...fs.readdirSync(root).filter(f => f.endsWith('.html') && f !== 'index.html'),
  ...walk(path.join(root, 'assets')).map(rel).filter(f => /\.(glb|jpe?g|png|webp|hdr|json)$/i.test(f) && !f.startsWith('assets/kona-years/src/') && (!f.startsWith('assets/reference/') || f.startsWith('assets/reference/paintings/'))),
];
const files = {};
for (const f of [...core, ...lazy]) {
  const p = path.join(root, f); if (!fs.existsSync(p)) { if (core.includes(f)) throw new Error(`missing core file ${f}`); continue; }
  files[f] = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('base64');
}
const digest = crypto.createHash('sha256').update(Object.entries(files).sort().map(([k, v]) => `${k}:${v}`).join('\n')).digest('hex');
const version = digest.slice(0, 12);
const manifest = { version, core, files };
fs.mkdirSync(path.join(root, 'app'), { recursive: true });
fs.writeFileSync(path.join(root, 'app/app-manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
const sw = fs.readFileSync(path.join(root, 'web/sw.template.js'), 'utf8')
  .replace('__VERSION__', version).replace('__MANIFEST__', () => JSON.stringify({ core, files }));
fs.writeFileSync(path.join(root, 'sw.js'), sw);
const bytes = Object.keys(files).reduce((n, f) => n + fs.statSync(path.join(root, f)).size, 0);
console.log(`sealed release ${version} · ${Object.keys(files).length} files (${core.length} core) · ${(bytes / 1048576).toFixed(1)} MB`);
