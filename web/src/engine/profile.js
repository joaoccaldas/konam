import { readStorage, writeStorage, removeStorage } from './storage.js';
import { defaultAvatarStyle, normaliseAvatarStyle } from './avatar.js';
// engine/profile.js — the visitor's profile and settings.
//
// On-device by default: one JSON record in localStorage, no server, no tracking. Sync across devices
// is optional and plugs in as another store with the same two methods (load/save); see
// docs/APP.md § Accounts. Everything the app remembers about a visitor lives here, so "export" and
// "delete everything" are one call each.
// Render presets. `lite` trims geometry at build time (a reload applies it); DPR and shadows apply live.
export const QUALITY = {
  auto: { label: 'Auto', note: 'Chosen for this device' },
  high: { label: 'High', note: 'Full detail, sharpest image', lite: false, dpr: 2, flowDpr: 1.65, shadows: true },
  balanced: { label: 'Balanced', note: 'Smooth on laptops', dpr: 1.5, flowDpr: 1.2, shadows: true },
  low: { label: 'Low', note: 'Phones and older computers; saves battery and data', lite: true, dpr: 1, flowDpr: .85, shadows: false },
};
export const AVATARS = ['#e8471c', '#138a8f', '#1d4fd6', '#c9a13b', '#ff3d8e', '#12181d', '#5fd8d3', '#8a3316'];

export const defaults = () => ({
  v: 1, name: '', gender: 'prefer-not', avatar: AVATARS[0], avatarStyle: defaultAvatarStyle(), quality: 'auto', sound: false, motion: 'auto', appearance: 'random', travel: 'teleport', units: 'metric',
  favourites: [], liveries: [], notifications: {enabled:false,whatsNew:true,raceWeek:true,newRooms:true}, analytics: false, createdAt: new Date().toISOString(), sync: null,
});

/** Validate/normalise a stored profile; unknown fields are dropped, bad values fall back to defaults. Pure. */
export function normalise(p) {
  const d = defaults(), o = p && typeof p === 'object' ? p : {};
  return {
    v: 1,
    name: typeof o.name === 'string' ? o.name.trim().slice(0, 40) : d.name,
    gender: ['male','female','prefer-not'].includes(o.gender) ? o.gender : d.gender,
    avatar: AVATARS.includes(o.avatar) ? o.avatar : d.avatar,
    avatarStyle: normaliseAvatarStyle(o.avatarStyle),
    quality: o.quality in QUALITY ? o.quality : d.quality,
    sound: !!o.sound,
    motion: ['auto', 'full', 'reduced'].includes(o.motion) ? o.motion : d.motion,
    appearance: ['auto','light','dark','random'].includes(o.appearance) ? o.appearance : d.appearance,
    travel: ['teleport', 'walk'].includes(o.travel) ? o.travel : d.travel,
    units: ['metric', 'imperial'].includes(o.units) ? o.units : d.units,
    favourites: Array.isArray(o.favourites) ? [...new Set(o.favourites.filter(x => typeof x === 'string'))].slice(0, 500) : [],
    liveries: Array.isArray(o.liveries) ? o.liveries.filter(x => x && typeof x === 'object' && typeof x.id === 'string' && /^#[0-9a-f]{6}$/i.test(x.frame || '')).slice(0, 40).map(x => ({
      id: x.id.slice(0, 40), name: String(x.name || 'My livery').slice(0, 40), kind: 'studio', frame: x.frame,
      ...Object.fromEntries(['accent', 'rim', 'disc', 'tape', 'saddle'].filter(k => /^#[0-9a-f]{6}$/i.test(x[k] || '')).map(k => [k, x[k]])),
      ...(x.finish && typeof x.finish === 'object' ? { finish: { roughness: +x.finish.roughness || .26, metalness: +x.finish.metalness || .15, clearcoat: +x.finish.clearcoat || 0 } } : {}) })) : [],
    notifications: o.notifications && typeof o.notifications==='object' ? {enabled:!!o.notifications.enabled,whatsNew:o.notifications.whatsNew!==false,raceWeek:o.notifications.raceWeek!==false,newRooms:o.notifications.newRooms!==false} : d.notifications,
    analytics: !!o.analytics,
    createdAt: typeof o.createdAt === 'string' ? o.createdAt : d.createdAt,
    sync: o.sync && typeof o.sync === 'object' ? { provider: String(o.sync.provider || ''), email: String(o.sync.email || '') } : null,
  };
}

/** The render settings a profile asks for on this device. Pure. */
export function renderSettings(quality, device) {
  const q = QUALITY[quality] || QUALITY.auto;
  const lite = q.lite ?? device.lite;
  const cap = q.dpr ?? (device.lite ? 1.45 : 2), flowCap = q.flowDpr ?? (device.lite ? 1.12 : 1.65);
  return { lite, dpr: Math.min(device.dpr, cap), flowDpr: Math.min(device.dpr, flowCap), shadows: q.shadows ?? !lite };
}

export const localStore = {
  load() { try { return JSON.parse(readStorage('profile') || 'null'); } catch (_) { return null; } },
  save(p) { try { return writeStorage('profile',JSON.stringify(p)); } catch (_) { return false; } },
  clear() { try { removeStorage('profile'); } catch (_) { } },
};

export function createProfile(store = localStore) {
  let p = normalise(store.load());
  const exists = !!store.load();
  let saved=true;
  const subs = new Set();
  const emit = () => subs.forEach(f => f(p));
  return {
    get: () => p,
    get saved() { return saved; },
    get exists() { return exists || !!p.name; },
    set(patch) { p = normalise({ ...p, ...patch }); saved=store.save(p)!==false; emit(); return p; },
    toggleFavourite(id) { const f = new Set(p.favourites); f.has(id) ? f.delete(id) : f.add(id); return this.set({ favourites: [...f] }); },
    subscribe(f) { subs.add(f); return () => subs.delete(f); },
    export() {
      return JSON.stringify({ profile: p, exported: new Date().toISOString() }, null, 1);
    },
    erase() { store.clear(); p = normalise(null); emit(); },
  };
}
