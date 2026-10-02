import { readStorage, writeStorage, removeStorage, storageKey } from '../engine/storage.js';
// studio/race-setup.js — My Kona Setup V0 domain contract.
// Pure composition logic + a tiny persistence adapter. No DOM, brand-specific behavior,
// account/network state, or executable content.
export const RACE_SETUP_KEY = storageKey('raceSetup');
export const RACE_SETUP_SCHEMA_VERSION = 1;
export const RACE_SETUP_EVENT = 'kona-2026';
export const RACE_SETUP_SLOTS = ['bike', 'wheel', 'helmet', 'shoe'];
const SCENE_IDS = new Set(['studio','kona','lava','night','velodrome','film']);
const SLOT_TYPES = { bike:'bike', wheel:'wheel', helmet:'helmet', shoe:'shoe' };

const b64u = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const unb64u = s => decodeURIComponent(escape(atob(s.replace(/-/g,'+').replace(/_/g,'/'))));
const catalogueIds = products => new Set((products || []).map(p => p.id));

export function createRaceSetup(eventId = RACE_SETUP_EVENT) {
  return {
    schema_version: RACE_SETUP_SCHEMA_VERSION,
    event_id: eventId === RACE_SETUP_EVENT ? eventId : RACE_SETUP_EVENT,
    slots: { bike:null, wheel:null, helmet:null, shoe:null },
    updated_at: 0,
  };
}

export const emptyRaceSetup = createRaceSetup;

/** Generic product→slot compatibility. Brand never participates. */
export function canEquip(product, slot) {
  if (!product || !RACE_SETUP_SLOTS.includes(slot)) return false;
  const type = product.product_type || product.type;
  if (type !== SLOT_TYPES[slot]) return false;
  return !Array.isArray(product.capabilities) || product.capabilities.includes('equip');
}

function cleanConfiguration(c) {
  const o = c && typeof c === 'object' ? c : {};
  return {
    look: typeof o.look === 'string' && o.look.length <= 600 ? o.look : '',
    scene: SCENE_IDS.has(o.scene) ? o.scene : 'kona',
  };
}

function cleanProductSlot(raw, slot, products) {
  if (!raw || typeof raw !== 'object') return null;
  const id = typeof raw.product_id === 'string' ? raw.product_id : typeof raw.productId === 'string' ? raw.productId : '';
  const product = (products || []).find(p => p.id === id);
  if (!product || !canEquip(product, slot)) return null;
  const configuration = cleanConfiguration(raw.configuration || { look:raw.look, scene:raw.scene });
  return { product_id:id, configuration };
}

/** Accept canonical records and the branch's earlier flat V0 record, output canonical only. */
export function validateRaceSetup(value, products = []) {
  const out = createRaceSetup();
  const o = value && typeof value === 'object' ? value : {};
  const canonical = o.schema_version === 1 && o.slots && typeof o.slots === 'object';

  if (canonical) {
    if (o.event_id !== RACE_SETUP_EVENT) return null;
    out.slots.bike = cleanProductSlot(o.slots.bike, 'bike', products);
    // V0 wheel is inherited from the bike. Standalone wheel products become valid once catalogued.
    const wheel = cleanProductSlot(o.slots.wheel, 'wheel', products);
    out.slots.wheel = wheel || (out.slots.bike ? { source:'bike', product_id:out.slots.bike.product_id } : null);
    out.slots.helmet = cleanProductSlot(o.slots.helmet, 'helmet', products);
    out.slots.shoe = cleanProductSlot(o.slots.shoe, 'shoe', products);
    out.updated_at = Number.isFinite(+o.updated_at) ? Math.max(0,+o.updated_at) : 0;
    return out;
  }

  // Migration from pre-contract branch state: {version,event,bike,wheels,helmet,shoes}.
  if (o.event && o.event !== RACE_SETUP_EVENT) return null;
  if (o.bike) {
    const id = typeof o.bike.productId === 'string' ? o.bike.productId : '';
    const p = (products || []).find(x => x.id === id);
    if (p && canEquip(p,'bike')) {
      out.slots.bike = { product_id:id, configuration:cleanConfiguration({ look:o.bike.look, scene:o.bike.scene }) };
      out.slots.wheel = { source:'bike', product_id:id };
    }
  }
  out.updated_at = Number.isFinite(+o.updatedAt) ? Math.max(0,+o.updatedAt) : 0;
  return out;
}

export const normaliseRaceSetup = (value, products=[]) => validateRaceSetup(value, products) || createRaceSetup();

export function setSetupSlot(setup, slot, product, configuration = {}, products = []) {
  if (!RACE_SETUP_SLOTS.includes(slot) || !canEquip(product, slot)) return normaliseRaceSetup(setup, products);
  const all = products.some?.(p => p.id === product.id) ? products : [...products, product];
  const next = normaliseRaceSetup(setup, all);
  next.slots[slot] = { product_id:product.id, configuration:cleanConfiguration(configuration) };
  if (slot === 'bike') next.slots.wheel = { source:'bike', product_id:product.id };
  next.updated_at = Date.now();
  return next;
}

export function clearSetupSlot(setup, slot, products = []) {
  const next = normaliseRaceSetup(setup, products);
  if (!RACE_SETUP_SLOTS.includes(slot)) return next;
  next.slots[slot] = null;
  if (slot === 'bike') next.slots.wheel = null;
  next.updated_at = Date.now();
  return next;
}

export function setupFromBike(product, lookPayload = '', scene = 'kona', products = [product]) {
  return setSetupSlot(createRaceSetup(), 'bike', product, { look:lookPayload, scene }, products);
}

export function createRaceSetupStore(storage = globalThis.localStorage) {
  return {
    load(products) {
      try { return normaliseRaceSetup(JSON.parse(readStorage('raceSetup',storage) || 'null'), products); }
      catch (_) { return createRaceSetup(); }
    },
    save(setup, products) {
      const clean = normaliseRaceSetup({ ...setup, updated_at:Date.now() }, products);
      if (!writeStorage('raceSetup',JSON.stringify(clean),storage)) throw new Error('Your setup could not be saved. Free device storage and try again.');
      return clean;
    },
    clear() { try { removeStorage('raceSetup',storage); } catch (_) { } },
  };
}

// Compatibility wrappers for existing Studio call sites; persistence itself stays behind the adapter.
export const readRaceSetup = (products, storage=globalThis.localStorage) => createRaceSetupStore(storage).load(products);
export const writeRaceSetup = (setup, products, storage=globalThis.localStorage) => createRaceSetupStore(storage).save(setup, products);

export function encodeRaceSetup(setup, products) {
  const clean = normaliseRaceSetup(setup, products);
  if (!clean.slots.bike) return '';
  const b=clean.slots.bike;
  const payload = {
    v:RACE_SETUP_SCHEMA_VERSION,
    e:clean.event_id,
    s:{ b:{ p:b.product_id, l:b.configuration.look || '', c:b.configuration.scene || 'kona' } }
  };
  return b64u(JSON.stringify(payload));
}

export function decodeRaceSetup(encoded, products) {
  if (!encoded || typeof encoded !== 'string' || encoded.length > 1200) return null;
  let o; try { o=JSON.parse(unb64u(encoded)); } catch (_) { return null; }
  if (!o || o.v !== 1 || o.e !== RACE_SETUP_EVENT || !o.s?.b || typeof o.s.b !== 'object') return null;
  const raw = {
    schema_version:1,
    event_id:o.e,
    slots:{
      bike:{ product_id:typeof o.s.b.p === 'string' ? o.s.b.p : '', configuration:{ look:typeof o.s.b.l === 'string' ? o.s.b.l : '', scene:typeof o.s.b.c === 'string' ? o.s.b.c : 'kona' } },
      wheel:null, helmet:null, shoe:null
    },
    updated_at:0
  };
  const clean=validateRaceSetup(raw, products);
  return clean?.slots.bike ? clean : null;
}

export function completedSlots(setup) {
  const s=setup?.slots || createRaceSetup().slots;
  return RACE_SETUP_SLOTS.filter(k => !!s[k]).length;
}
