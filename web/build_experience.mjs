// Builds Experiences.html: the three night experiences and History Lane.
//   node web/build_experience.mjs
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname), root = path.resolve(here, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'museum/catalog.json'), 'utf8'));
const e = catalog.entries.find(x => x.id === 'canyon-speedmax-cfr-axs-my2027-m');
const profile = JSON.parse(fs.readFileSync(path.join(root, e.viewerProfile), 'utf8'));
globalThis.__BIKE_PROFILE = profile;
const src = fs.readFileSync(path.join(here, 'src/data.js'), 'utf8');
const mod = await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64') + '#exp');
const parts = {};
for (const [id, v] of Object.entries(mod.PARTS)) if (!v.alias && v.name) parts[id] = { name: v.name, group: v.group, spec: v.spec, weight: v.weight, note: v.note };
// the part tree resolves aliases to the part that carries the information
for (const [id, v] of Object.entries(mod.PARTS)) if (v.alias && parts[v.alias]) parts[id] = parts[v.alias];
const refHtml = fs.readFileSync(path.join(root, 'assets/reference/cfr/product-4524-se.html'), 'utf8');
const locales = [...new Set([...refHtml.matchAll(/https:\/\/www\.canyon\.com\/(en-[a-z]{2})\/road-bikes\/triathlon-bikes\/speedmax\/cfr\/speedmax-cfr-axs\/4524\.html/g)].map(m => m[1]))];
const c = e.comparison, spec = profile.bike.specs;
const data = {
  glb: 'assets/museum/speedmax_web.glb', studio: e.viewer, parts, locales,
  product: 'https://www.canyon.com/{loc}/road-bikes/triathlon-bikes/speedmax/cfr/speedmax-cfr-axs/4524.html',
  stats: [[`${spec.weightKg} kg`, 'size M'], [c.gear, `${c.cassette} · 12 sp`], [c.wheels.split('·')[1].trim().replace(' mm', ''), 'mm rims']],
  history: JSON.parse(fs.readFileSync(path.join(root, 'museum/history.json'), 'utf8')),
};
const res = await build({ entryPoints: [path.join(here, 'src/exp/main.js')], bundle: true, format: 'iife', minify: true, write: false, target: 'es2020', legalComments: 'none' });
const html = fs.readFileSync(path.join(here, 'experience.template.html'), 'utf8')
  .replace('__EXP__', () => JSON.stringify(data).replaceAll('<', '\\u003c'))
  .replace('__APP__', () => res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script'));
fs.writeFileSync(path.join(root, 'Experiences.html'), html);
console.log(`wrote Experiences.html · ${Object.keys(parts).length} parts · ${locales.length} Canyon locales · ${(html.length / 1024).toFixed(0)} kB`);
