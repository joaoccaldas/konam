// studio/model.js — the studio's pure logic (no DOM, no WebGL): scenes, filtering, and looks as links.
import { skinProblems, skinFromFilm } from '../engine/skins.js';

export const SCENES = {
  studio: { label: 'Studio', sky: ['#f4efe7', '#d9d2c6'], floor: '#e9e2d6', hemi: 1.1, key: 2.2, keyColor: '#ffffff', rim: '#9fd8ff', rimI: 1.2, exposure: 1, light: true },
  kona: { label: 'Kona dusk', sky: ['#2b3a67', '#f3a36b'], floor: '#2a2622', hemi: .8, key: 2.4, keyColor: '#ffd2a1', rim: '#5fd8d3', rimI: 1.6, exposure: 1.05 },
  lava: { label: 'Lava field', sky: ['#120c0a', '#5a2210'], floor: '#141116', hemi: .5, key: 1.6, keyColor: '#ff9d6a', rim: '#ff592c', rimI: 2.2, exposure: 1.1 },
  night: { label: 'Night', sky: ['#05070c', '#1c2433'], floor: '#0e1114', hemi: .35, key: 1.8, keyColor: '#cfe0ff', rim: '#3dffe0', rimI: 2.4, exposure: 1.15 },
  velodrome: { label: 'Velodrome', sky: ['#1a120c', '#c89b62'], floor: '#8a6a44', hemi: .9, key: 2.2, keyColor: '#fff1dc', rim: '#1d4fd6', rimI: 1.4, exposure: 1 },
  film: { label: 'Film', sky: ['#000', '#333'], floor: '#111', hemi: .6, key: 2, keyColor: '#ffffff', rim: '#ffffff', rimI: 2, exposure: 1.05 },
};

/** Filter and order the catalogue for the Bikes tab. Pure. */
export function productsFor(products, { brand, origin, q, fav, favourites = [], event } = {}) {
  const needle = (q || '').trim().toLowerCase();
  let list = products.filter(p => (!brand || p.brand === brand) && (!origin || p.origin === origin) && (!fav || favourites.includes(p.id))
    && (!needle || [p.name, p.brand, p.family, p.year, p.years, p.era, p.category].filter(Boolean).join(' ').toLowerCase().includes(needle)));
  if (event?.featured?.length) list = [...list].sort((a, b) => (event.featured.includes(b.id) ? 1 : 0) - (event.featured.includes(a.id) ? 1 : 0));
  return list;
}

// A look travels in the URL as base64url JSON: { k: skin id | 'c', c: custom colours, f: finish, t: film id }.
const b64u = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
const HEX = /^#[0-9a-f]{6}$/i;
export function encodeLook(l) {
  if (!l) return '';
  const o = {};
  if (l.theme) o.t = l.theme; else if (l.skin?.id) o.k = l.skin.id;
  if (l.custom) o.c = Object.fromEntries(Object.entries(l.custom).filter(([k, v]) => ['frame', 'accent', 'rim', 'disc', 'tape', 'saddle'].includes(k) && HEX.test(v)));
  if (l.finish && l.finish !== 'gloss') o.f = l.finish;
  return Object.keys(o).length ? b64u(JSON.stringify(o)) : '';
}
/** Decode and validate a look from a link; anything unexpected is dropped. Pure. */
export function decodeLook(s, product, films = []) {
  if (!s || typeof s !== 'string' || s.length > 600) return null;
  let o; try { o = JSON.parse(unb64u(s)); } catch (_) { return null; }
  if (!o || typeof o !== 'object') return null;
  const look = { skin: product?.skins?.[0] || null, finish: ['gloss', 'satin', 'matte'].includes(o.f) ? o.f : 'gloss', custom: null };
  if (typeof o.t === 'string') { const f = films.find(x => x.id === o.t); if (f) return { ...look, skin: skinFromFilm(f), theme: f.id }; }
  if (typeof o.k === 'string') look.skin = product?.skins?.find(x => x.id === o.k) || look.skin;
  if (o.c && typeof o.c === 'object') {
    const c = Object.fromEntries(Object.entries(o.c).filter(([k, v]) => ['frame', 'accent', 'rim', 'disc', 'tape', 'saddle'].includes(k) && HEX.test(v)));
    if (Object.keys(c).length && !skinProblems({ id: 'custom', name: 'Custom', frame: c.frame || look.skin?.frame || '#888888', ...c }).length) look.custom = c;
  }
  return look;
}
