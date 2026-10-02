// Product catalogue for the studio (and anything else that lists products).
// Reads the original sources and writes museum/catalog/products.json; never edit that file by hand.
//   node tools/build_catalog.mjs
// Sources (each product records which one it came from):
//   museum/catalog.json + museum/viewer-*.json      Canyon current bikes and heritage generations
//   museum/catalog/canyon-assets.json                where each Canyon model's GLB lives
//   assets/kona-years/bikes/*/build-meta.json        the two champions' machines
//   museum/atlas/bikes.json                          every non-Canyon bike, type study and studio design
//   museum/skins/museum.json                         archive finishes (Canyon)
import { contentVisible } from '../web/src/engine/event-visibility.js';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const J = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
const exists = f => fs.existsSync(path.join(root, f));
const GLB = J('museum/catalog/canyon-assets.json').glb;
const skins = J('museum/skins/museum.json').skins;
const hallFinish = key => skins.find(s => s.id === `hall-${key}`);
const products = [];

// Canyon, current (catalog entries that have a viewer profile)
for (const e of J('museum/catalog.json').entries) {
  if (!e.viewerProfile || !exists(e.viewerProfile)) continue;
  const b = J(e.viewerProfile).bike; if (!GLB[b.key] || !b.year || J('museum/catalog.json').heritage.some(h => h.key === b.key)) continue;
  products.push({
    id: `canyon-${b.key}-${b.year}`, brand: 'Canyon', family: 'Speedmax', name: b.name, year: +b.year, type: 'bike', category: 'triathlon',
    origin: 'canyon-model', glb: GLB[b.key], museum: true, deepStudio: e.viewer || null,
    facts: [b.weight ? { cls: 'P', text: `Published weight ${b.weight} kg (size ${b.size}).` } : null, b.price ? { cls: 'P', text: `Price ${b.price} (Canyon Sweden).` } : null].filter(Boolean),
    skins: hallFinish(b.key) ? [{ ...hallFinish(b.key), name: 'Showroom' }] : [],
    sources: [{ label: 'Canyon product page', url: b.source }, { label: 'Viewer profile', file: e.viewerProfile }],
  });
}
// Canyon, heritage generations that have a model
for (const h of J('museum/catalog.json').heritage) {
  if (!h.key || !GLB[h.key]) continue;
  products.push({
    id: `canyon-${h.key}`, brand: 'Canyon', family: 'Speedmax', name: h.name, year: +String(h.years).slice(-4), years: h.years, type: 'bike', category: 'triathlon',
    origin: 'canyon-archive', glb: GLB[h.key], museum: true, deepStudio: h.viewer || null, material: h.material,
    facts: [h.note ? { cls: 'P', text: h.note } : null, h.material ? { cls: 'P', text: `Frame: ${h.material}.` } : null].filter(Boolean),
    skins: hallFinish(h.key) ? [{ ...hallFinish(h.key), name: 'Documented finish' }] : [],
    sources: [{ label: 'Museum catalogue', file: 'museum/catalog.json' }, h.manifest ? { label: 'Evidence manifest', file: `museum/${h.manifest}` } : null].filter(Boolean),
  });
}
// the champions' machines (Kona by Year)
for (const key of ['cfslx-2015', 'cfr-2019']) {
  const f = `assets/kona-years/bikes/${key}/build-meta.json`; if (!exists(f) || !GLB[key]) continue;
  const m = J(f);
  products.push({
    id: `canyon-kona-${key}`, brand: 'Canyon', family: 'Speedmax', name: m.name, year: +key.slice(-4), type: 'bike', category: 'triathlon',
    origin: 'geometry-study', glb: GLB[key], museum: true,
    facts: [{ cls: 'P', text: `Geometry from ${m.geometry_source}.` }, { cls: 'I', text: `Tube depths: ${m.tube_depths}.` }],
    skins: [], sources: [{ label: 'Build record', file: f }],
  });
}
// everything built by blender/atlas_build.py
for (const b of J('museum/atlas/bikes.json').bikes) {
  const origin = b.studio ? 'studio-design' : b.kind === 'type' ? 'type-study' : 'photo-rebuild';
  products.push({
    id: `atlas-${b.key}`, brand: b.kind === 'named' ? (b.brand || b.maker) : origin === 'studio-design' ? 'Studio' : 'Type study', family: b.arch, name: b.name, year: b.year || null, era: b.era || null,
    type: 'bike', category: /track|hour|pursuit|sprint/.test(b.key) ? 'track' : b.room === 'hour' ? 'track' : 'triathlon',
    origin, glb: `assets/atlas/${b.key}/bike.glb`, museum: b.museum !== false, text: b.text,
    facts: b.facts.map(([cls, text]) => ({ cls, text })),
    skins: b.skins, ref: b.ref || null, atlasKey: b.key,
    sources: [{ label: 'Bike record', file: 'museum/atlas/bikes.json' }, b.ref ? { label: `Photo: ${b.ref.artist} (${b.ref.license})`, url: b.ref.page } : null].filter(Boolean),
  });
}
// museum editions: bikes shown in a room as a Speedmax CFR in that room's livery. Each is a product,
// so every bike in the building can be opened, repainted and shared in the studio.
const CFR = { glb: GLB.cfr, base: 'canyon-cfr-2027' };
const edition = (group, id, name, sub, skin, text, where) => products.push({
  id: `edition-${group}-${id}`, brand: 'Canyon', family: 'Speedmax', name, sub, year: 2027, type: 'bike', category: 'triathlon',
  origin: 'museum-edition', edition: group, base: CFR.base, glb: CFR.glb, museum: true, text,
  facts: [{ cls: 'I', text: `A Speedmax CFR in the ${sub} livery, as shown in ${where}. The frame is the CFR model; only the paint is the edition's.` }],
  skins: [skin], sources: [{ label: 'Livery', file: group === 'film' ? 'museum/themes/films.json' : group === 'wyld' ? 'museum/wyld_room.json' : 'museum/skins/museum.json' }],
});
for (const f of J('museum/themes/films.json').films.filter(contentVisible))
  edition('film', f.id, f.name, `${f.film} · ${f.persona}`, { id: `film-${f.id}`, name: f.name, kind: 'dye', dye: { stops: f.stops, angle: f.angle, scale: f.scale, flow: f.flow, darkness: f.darkness || 0 } }, f.tagline, 'the Sanctuary');
for (const v of J('museum/wyld_room.json').variants.filter(v=>contentVisible({edition:'wyld'})))
  edition('wyld', v.id, v.name, v.sub, { id: `wyld-${v.id}`, name: v.name, kind: 'dye', decalDark: v.decal, finish: { roughness: v.wyld?.sheer > .5 ? .18 : .3, metalness: .15, clearcoat: 1 }, dye: v.wyld }, v.text, 'the WYLD Room');
for (const sk of skins.filter(x => ['galleries', 'lava-night', 'artworld'].includes(x.group)))
  edition(sk.group, sk.id.replace(/^(theme|art)-/, ''), sk.group === 'galleries' ? `${sk.name} room CFR` : sk.name, sk.name, { ...sk, group: undefined }, sk.note || '', sk.group === 'galleries' ? `the ${sk.name} room` : sk.group === 'lava-night' ? 'Lava Night' : 'the Secret Collection');

// where each product can be seen: the rooms registry and the wings
const ROOMS = J('museum/world/rooms.json').areas;
const WINGS = J('museum/world/wings/index.json').wings.map(f => J(`museum/world/wings/${f}`));
for (const p of products) {
  const where = [];
  for (const r of ROOMS) {
    const ex = r.exhibits || {};
    if (ex.products?.includes(p.id)) where.push(r.id);
    if (p.edition && ex.editions === p.edition && (!ex.edition || p.skins[0]?.id === ex.edition)) where.push(r.id);
  }
  if (p.atlasKey) { const b = J('museum/atlas/bikes.json').bikes.find(x => x.key === p.atlasKey); for (const w of WINGS) if (w.rooms.some(r => r.id === b.room)) where.push(`atlas-${w.id}-${b.room}`); }
  const nameOf = id => ROOMS.find(r => r.id === id)?.name || WINGS.flatMap(w => w.rooms.map(r => [`atlas-${w.id}-${r.id}`, `${r.name} · ${w.name}`])).find(([k]) => k === id)?.[1] || id;
  p.where = [...new Set(where)].map(id => ({ id, name: nameOf(id) }));
  p.museum = p.where.length > 0;
}
for (const p of products) if (!exists(p.glb)) throw new Error(`missing model for ${p.id}: ${p.glb}`);
const out = { schema_version: 1, generated_by: 'tools/build_catalog.mjs', count: products.length, in_museum: products.filter(p => p.museum).length,
  studio_only: products.filter(p => !p.museum).length, brands: [...new Set(products.map(p => p.brand))], products };
fs.writeFileSync(path.join(root, 'museum/catalog/products.json'), JSON.stringify(out, null, 1));
console.log(`products.json · ${products.length} products (${out.studio_only} studio-only) · brands: ${out.brands.join(', ')}`);
