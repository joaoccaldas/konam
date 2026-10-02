// Shared museum catalogs for the hall and the studio.
// Add a dataset here, then rebuild. Do not paste JSON back into index.html or Studio.html.
//
// app/museum-data.js is loaded by both pages and sets window.__HALL plus the
// window.__* names the scenes already read.
// app/studio-catalog.js loads only on Studio.html, after museum-data.js, because the
// studio product list (museum/catalog/products.json) is not the public catalog.
import { eventEnabled, contentVisible } from './src/engine/event-visibility.js';
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(here, '..');
const appDir = path.join(root, 'app');

const readJson = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
const jsText = value => JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');

const ALIASES = {
  __PIECES: 'pieces',
  __KONA: 'kona',
  __WYLDROOM: 'wyldroom',
  __KONAYEARS: 'konayears',
  __ATLAS: 'atlas',
  __SKINS: 'skins',
  __WINGS: 'wings',
  __FILMS: 'films',
  __ROOMS: 'rooms',
  __ART: 'art',
  __EVENT: 'event',
  __ISLAND: 'island',
  __BRANDROOMS: 'brandrooms',
  __PRODUCTS: 'products',
  __CANDIDATES: 'candidates',
  __EVENTS: 'events',
};

function studio(key) {
  const f = path.join(root, 'museum/studio', `viewer-${key}-studio.json`);
  return fs.existsSync(f) ? readJson(path.relative(root, f)).bike : {};
}

async function modernParts(profileFile) {
  const src = fs.readFileSync(path.join(here, 'src/data.js'), 'utf8');
  const profile = readJson(profileFile);
  globalThis.__BIKE_PROFILE = profile;
  const mod = await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64') + '#' + profileFile);
  delete globalThis.__BIKE_PROFILE;
  const out = {};
  for (const [id, v] of Object.entries(mod.PARTS)) if (!v.alias && v.name) out[id] = { name: v.name, group: v.group, spec: v.spec, weight: v.weight, note: v.note };
  return out;
}

const HERITAGE_SPEC = {
  frame: ['Frame'], fork: ['Fork'], crankset: ['Crankset', 'Cranks'], chainrings: ['Crankset'], crank_arm_ds: ['Crankset'], crank_arm_nds: ['Crankset'],
  cassette: ['Cassette'], chain: ['Chain', 'Drivetrain'], rear_derailleur: ['Rear derailleur', 'Drivetrain'], front_derailleur: ['Front derailleur', 'Drivetrain'],
  brake_front: ['Brakes'], brake_rear: ['Brakes'], brake_levers: ['Brake levers', 'Shifters'], wheel_front: ['Wheels', 'Front wheel'], wheel_rear: ['Wheels', 'Rear wheel'],
  saddle: ['Saddle'], seatpost: ['Seatpost'], stem: ['Stem', 'Cockpit'], base_bar: ['Handlebar', 'Base bar', 'Cockpit'], extensions: ['Aerobar', 'Extensions', 'Cockpit'],
  cables: ['Drivetrain'], spindle: ['Bottom bracket', 'Crankset'],
};
const HERITAGE_GROUP = { frame: 'frame', fork: 'frame', wheel_front: 'wheels', wheel_rear: 'wheels', saddle: 'contact', seatpost: 'contact', stem: 'cockpit', base_bar: 'cockpit', extensions: 'cockpit', brake_levers: 'cockpit', brake_front: 'brakes', brake_rear: 'brakes', cables: 'cockpit' };

function heritageParts(key) {
  const f = path.join(root, `museum/viewer-${key}.json`);
  const b = readJson(path.relative(root, f)).bike, labels = readJson(path.relative(root, f)).partLabels || {};
  const rows = Object.fromEntries((b.spec || []).map(([k, v]) => [k.toLowerCase(), [k, v]]));
  const out = {};
  for (const [id, keys] of Object.entries(HERITAGE_SPEC)) {
    const hit = keys.map(k => rows[k.toLowerCase()]).find(Boolean);
    const nice = { wheel_front: 'Front wheel', wheel_rear: 'Rear wheel', brake_front: 'Front brake', brake_rear: 'Rear brake', crank_arm_ds: 'Drive-side crank', crank_arm_nds: 'Non-drive crank', rear_derailleur: 'Rear derailleur', front_derailleur: 'Front derailleur', spindle: 'Bottom-bracket spindle' };
    const name = labels[id] || nice[id] || id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    out[id] = { name, group: HERITAGE_GROUP[id] || 'drivetrain', spec: hit ? hit[1] : null, specLabel: hit ? hit[0] : null,
      note: id === 'frame' ? b.story : hit ? null : 'Simplified external form rebuilt from the archived specification.' };
  }
  return out;
}

function archivePhoto(manifests, key) {
  const m = manifests[key]; const r = m?.references?.find(x => /\.jpe?g$/.test(x.path));
  if (!r) return null;
  const ts = r.url.match(/\/web\/(\d{8})/)?.[1];
  return { src: r.url.replace(/\/web\/(\d+)\//, '/web/$1im_/'), credit: `Canyon studio photograph · archived ${ts ? ts.slice(0, 4) : ''} · Wayback Machine`, href: r.url };
}

function productPhoto(file, pageUrl) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const src = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
  return src ? { src, credit: 'Canyon.com product photograph', href: pageUrl } : null;
}

export async function assembleMuseumData() {
  const catalog = readJson('museum/catalog.json');
  const wingsIndex = readJson('museum/world/wings/index.json');
  const wings = wingsIndex.wings.map(f => readJson(`museum/world/wings/${f}`));
  const art = {
    paintings: readJson('museum/art/paintings.json').paintings,
    sculptures: fs.existsSync(path.join(root, 'museum/art/sculptures.json')) ? readJson('museum/art/sculptures.json').sculptures : [],
  };
  const skins = readJson('museum/skins/museum.json');
  const finish = Object.fromEntries(skins.skins.filter(s => s.id.startsWith('hall-')).map(s => [s.id.slice(5), s.frame]));
  const glb = readJson('museum/catalog/canyon-assets.json').glb;
  const manifests = Object.fromEntries(fs.readdirSync(path.join(root, 'museum/bikes')).filter(f => f.startsWith('canyon-')).map(f => {
    const m = JSON.parse(fs.readFileSync(path.join(root, 'museum/bikes', f), 'utf8'));
    return [m.pipeline?.out_dir?.split('/').pop(), m];
  }));
  let candidates = { schema_version: 1, items: [] };
  try { candidates = readJson('integrations/candidate-products.json'); } catch { /* intake file optional */ }
  const eventsDir = path.join(root, 'museum/events');
  const events = fs.existsSync(eventsDir) ? fs.readdirSync(eventsDir).filter(f => f.endsWith('.json')).map(f => readJson(`museum/events/${f}`)) : [];

  const pieces = catalog.heritage.map(h => {
    const b = h.key ? studio(h.key) : {};
    return {
      key: h.key || null, years: h.years, name: h.name, material: h.material, note: h.note,
      why: h.why || null, source: h.source || null, viewer: h.viewer || null,
      glb: h.key ? glb[h.key] : null, finish: h.key ? finish[h.key] : null,
      thumb: h.key ? `assets/reference/paintings/${h.key}.jpg` : null,
      stats: h.key ? [[`${b.weight} kg`, `size ${b.size}`], [b.gear, b.gearSub], [b.rims, /^[\d/ ]+$/.test(b.rims || '') ? 'mm rims' : 'wheels']] : null,
      parts: h.key ? heritageParts(h.key) : null, photo: h.key ? archivePhoto(manifests, h.key) : null,
      uncertain: h.key ? (manifests[h.key]?.uncertainties || []).slice(0, 4) : null,
    };
  });
  for (const [key, id, blurb] of [
    ['cfr', 'canyon-speedmax-cfr-axs-my2027-m', 'The sixth-generation flagship: AeroShield cockpit, AeroFuel storage and a Splitter Plate seatpost, built for Kona.'],
    ['slx', 'canyon-speedmax-slx-8-di2-my2027-m', 'The same MY2027 platform with Shimano Ultegra Di2 and 4iiii power — the Speedmax most athletes will actually race.'],
  ]) {
    const e = catalog.entries.find(x => x.id === id), c = e.comparison;
    const spec = readJson(e.viewerProfile).bike.specs;
    pieces.push({
      key, years: '2027', name: spec.name, material: `CFR carbon · ${c.groupset}`.replace('CFR carbon · Shimano', 'CF SLX carbon · Shimano'),
      note: blurb, viewer: e.viewer, glb: glb[key], finish: finish[key], thumb: e.thumbnail, flagship: true,
      stats: [[`${spec.weightKg} kg`, 'size M'], [c.gear, `${c.cassette} · 12 sp`], [c.wheels.split('·')[1].trim().replace(' mm', ''), 'mm rims']],
      parts: await modernParts(e.viewerProfile),
      photo: productPhoto(`assets/reference/${key}/product-${key === 'cfr' ? 4524 : 4520}-se.html`, spec.source || 'https://www.canyon.com/'),
    });
  }

  return {
    pieces,
    kona: readJson('museum/kona_champions.json'),
    wyldroom: eventEnabled('wyld') ? readJson('museum/wyld_room.json') : null,
    konayears: readJson('museum/kona_years.json'),
    atlas: readJson('museum/atlas/bikes.json'),
    skins,
    wings,
    films: {...readJson('museum/themes/films.json'),films:readJson('museum/themes/films.json').films.filter(contentVisible)},
    rooms: {...readJson('museum/world/rooms.json'),areas:readJson('museum/world/rooms.json').areas.filter(contentVisible)},
    art,
    event: readJson('integrations/sources/kona-2026.ironman.json'),
    island: readJson('museum/kona/island-guide.json'),
    brandrooms: readJson('museum/world/brand_rooms.json'),
    products: readJson('integrations/public-catalog.json'),
    candidates,
    events,
  };
}

export function writeMuseumData(data) {
  fs.mkdirSync(appDir, { recursive: true });
  const assigns = Object.entries(ALIASES).map(([name, key]) => `${name}:window.__HALL.${key}`).join(',');
  const js = `/* Generated from the museum JSON. Source of truth: web/museum_data.mjs */\nwindow.__HALL=${jsText(data)};\nObject.assign(window,{${assigns},__ATLAS_METHOD:window.__HALL.atlas&&window.__HALL.atlas.method});\n`;
  fs.writeFileSync(path.join(appDir, 'museum-data.js'), js);
  return js.length;
}

export function writeStudioCatalog() {
  fs.mkdirSync(appDir, { recursive: true });
  const products = readJson('museum/catalog/products.json');
  const js = `/* Studio product list. Load after museum-data.js so this owns window.__PRODUCTS on Studio.html. */\nwindow.__PRODUCTS=${jsText(products)};\n`;
  fs.writeFileSync(path.join(appDir, 'studio-catalog.js'), js);
  return js.length;
}
