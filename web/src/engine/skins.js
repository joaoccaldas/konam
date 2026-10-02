// engine/skins.js — the one livery system.
//
// Every bike GLB in the museum follows one contract (docs/ARCHITECTURE.md § Bike asset contract):
// its paintable materials carry names from SLOTS below. A skin is plain data that names colours
// (and optionally a dye pattern or a glow) per slot; applySkin() is the only code that paints a bike.
// Hall finishes, the WYLD dyes, the Bike Porn films, the theme rooms, Lava Night and the Against the
// Clock liveries all go through here.
import { applyWyld } from '../skins/wyld.js';

// Canonical slot → material names found in the pipelines' GLBs (first is the canonical name).
export const SLOTS = {
  frame: ['paint_frame'],
  accent: ['paint_accent'],
  rim: ['rim', 'rim_carbon', 'rim_alu', 'carbon_rim'],
  disc: ['disc_face', 'carbon_disc'],
  tape: ['bar_tape'],
  saddle: ['saddle', 'saddle_cover'],
  decalLight: ['decal_light'],
  decalDark: ['decal_dark', 'decal_orange'],
  tyre: ['rubber_tyre', 'rubber'],
};
const SLOT_OF = Object.fromEntries(Object.entries(SLOTS).flatMap(([slot, names]) => names.map(n => [n, slot])));
export const slotOfMaterial = name => SLOT_OF[name] || null;
export const REQUIRED_SLOTS = ['frame'];

const HEX = /^#[0-9a-f]{6}$/i;
export const SKIN_KINDS = ['photo', 'studio', 'archive', 'dye', 'theme'];

/** Validate a skin object; returns a list of problems (empty = valid). Pure, used by tests and tools. */
export function skinProblems(s) {
  const out = [];
  if (!s || typeof s !== 'object') return ['not an object'];
  if (!s.id || !/^[a-z0-9][a-z0-9-]*$/.test(s.id)) out.push(`bad id ${s.id}`);
  if (!s.name) out.push(`${s.id}: no name`);
  if (s.kind && !SKIN_KINDS.includes(s.kind)) out.push(`${s.id}: unknown kind ${s.kind}`);
  if (!s.frame && !s.dye) out.push(`${s.id}: needs frame colour or dye`);
  for (const k of ['frame', 'accent', 'rim', 'disc', 'tape', 'saddle', 'decalLight', 'decalDark']) if (s[k] != null && !HEX.test(s[k])) out.push(`${s.id}: ${k} is not #rrggbb`);
  if (s.dye && !(Array.isArray(s.dye.stops) ? s.dye.stops.length >= 5 && s.dye.stops.every(c => HEX.test(c)) : s.dye.stops == null)) out.push(`${s.id}: dye.stops needs 5 colours`);
  if (s.glow && !HEX.test(s.glow.color || '')) out.push(`${s.id}: glow.color`);
  if (s.decals && ((s.decals.color && !HEX.test(s.decals.color)) || (s.decals.glow && !HEX.test(s.decals.glow)))) out.push(`${s.id}: decals colours`);
  return out;
}

/**
 * Give this bike its own materials (so one skin never leaks into another copy) and index them by slot.
 * Returns { root, slots: { frame: [Material], ... }, materials: Set }.
 */
export function ownMaterials(root) {
  const slots = {}, seen = new Map();
  root.traverse(o => {
    if (!o.isMesh) return;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    const mine = list.map(m => {
      if (!m) return m;
      if (!seen.has(m)) { const c = m.clone(); c.userData = { ...m.userData, base: { color: m.color?.clone(), roughness: m.roughness, metalness: m.metalness, emissive: m.emissive?.clone(), emissiveIntensity: m.emissiveIntensity } }; seen.set(m, c); }
      return seen.get(m);
    });
    o.material = Array.isArray(o.material) ? mine : mine[0];
  });
  for (const m of seen.values()) { const s = slotOfMaterial(m.name); if (s) (slots[s] ||= []).push(m); }
  return { root, slots, materials: new Set(seen.values()) };
}

/** Index materials by slot without cloning (for bikes that already own their materials). */
export function slotsOf(root) {
  const slots = {};
  const seen = new Set();
  root.traverse(o => { if (o.isMesh) for (const m of [].concat(o.material || [])) if (m && !seen.has(m)) {
    seen.add(m); m.userData.base ||= { color: m.color?.clone(), roughness: m.roughness, metalness: m.metalness, emissive: m.emissive?.clone(), emissiveIntensity: m.emissiveIntensity };
    const s = slotOfMaterial(m.name); if (s) (slots[s] ||= []).push(m); } });
  return { root, slots, materials: seen };
}

const FINISH_DEFAULT = { roughness: .26, metalness: .15, clearcoat: 1 };

/**
 * Paint a bike. `bike` is what ownMaterials()/slotsOf() returned. Slots the skin does not name are
 * restored to the GLB's own colour, so switching skins never leaves a previous livery behind.
 */
export function applySkin(bike, skin) {
  if (!bike?.slots || !skin) return bike;
  const set = (slot, hex) => {
    for (const m of bike.slots[slot] || []) {
      const base = m.userData.base;
      if (hex) m.color?.set(hex); else if (base?.color) m.color.copy(base.color);
    }
  };
  set('frame', skin.dye ? null : skin.frame);
  set('accent', skin.accent);
  for (const k of ['rim', 'disc', 'tape', 'saddle']) set(k, skin[k]);
  set('decalLight', skin.decals?.color || skin.decalLight); set('decalDark', skin.decals?.color || skin.decalDark);
  const fin = { ...FINISH_DEFAULT, ...(skin.finish || {}) };
  const painted = [...(bike.slots.frame || []), ...(skin.accent ? bike.slots.accent || [] : [])];
  for (const m of painted) { m.roughness = fin.roughness; m.metalness = fin.metalness; if ('clearcoat' in m) m.clearcoat = fin.clearcoat; }
  const glow = (mats, g) => { for (const m of mats) { if (!m.emissive) continue;
    if (g) { m.emissive.set(g.color); m.emissiveIntensity = g.intensity ?? .28; }
    else { const b = m.userData.base; if (b?.emissive) m.emissive.copy(b.emissive); m.emissiveIntensity = b?.emissiveIntensity ?? 1; } } };
  glow([...(bike.slots.frame || []), ...(bike.slots.accent || [])], skin.glow);
  glow([...(bike.slots.decalLight || []), ...(bike.slots.decalDark || [])], skin.decals?.glow ? { color: skin.decals.glow, intensity: skin.decals.intensity } : null);
  if (skin.dye) for (const m of bike.slots.frame || []) bike.dye = applyWyld(m, bike.root, skin.dye);
  else if (bike.dye) { for (const m of bike.slots.frame || []) restoreDye(m); bike.dye = null; }
  bike.skin = skin;
  return bike;
}

function restoreDye(m) {
  const b = m.userData.wyldBase;
  if (!b) return;
  if (m.userData.wyldPrevOBC) m.onBeforeCompile = m.userData.wyldPrevOBC; else delete m.onBeforeCompile;          // back to three's defaults
  if (m.userData.wyldPrevKey) m.customProgramCacheKey = m.userData.wyldPrevKey; else delete m.customProgramCacheKey;
  m.color.copy(b.color); m.transparent = b.transparent; m.opacity = b.opacity;
  delete m.userData.wyld; delete m.userData.wyldBase;
  m.needsUpdate = true;
}

// Adapters: the WYLD room variants and the Bike Porn films keep their own data files; these turn an
// entry into a skin so they are painted by applySkin like everything else.
export function skinFromWyld(v) {
  return { id: `wyld-${v.id}`, name: v.name, kind: 'dye', decalDark: v.decal, finish: { roughness: v.wyld?.sheer > .5 ? .18 : .3, metalness: .15, clearcoat: 1 }, dye: v.wyld };
}
export function skinFromFilm(f) {
  return { id: `film-${f.id}`, name: f.name, kind: 'dye', dye: { stops: f.stops, angle: f.angle, scale: f.scale, flow: f.flow, darkness: f.darkness || 0 } };
}
