// Canonical local-storage namespace adapter.
// New code must use kona.* keys. Legacy speedmax.* keys are read/migrated for compatibility.

export const STORAGE_VERSION = 1;
export const STATE_CHANGE_EVENT = 'kona:statechange';

const announceStateChange = (name, action='write') => {
  try { globalThis.dispatchEvent?.(new CustomEvent(STATE_CHANGE_EVENT,{detail:{name,action}})); } catch (_) {}
};

const MAP = Object.freeze({
  brandRandom: { current: 'kona.brand.random-family.v1', legacy: [], area: 'session' },
  returnJourneySession: { current: 'kona.returnJourney.session.v1', legacy: [], area: 'session' },
  surpriseSession: { current: 'kona.surprise.session.v1', legacy: [], area: 'session' },
  analyticsSession: { current: 'kona.analytics.session.v1', legacy: [], area: 'session' },
  analyticsMode: { current: 'kona.analytics.mode.v2', legacy: [], area: 'session' },
  analyticsAcquisition: { current: 'kona.analytics.acquisition.v2', legacy: [], area: 'session' },
  analyticsEngaged: { current: 'kona.analytics.engaged15.v1', legacy: [], area: 'session' },
  profile: { current: 'kona.profile.v1', legacy: ['speedmax.profile.v1'] },
  passport: { current: 'kona.passport.v1', legacy: ['speedmax.passport.v1'] },
  finds: { current: 'kona.finds.v1', legacy: ['speedmax.finds.v1'] },
  raceSetup: { current: 'kona.raceSetup.v1', legacy: ['speedmax.raceSetup.v1'] },
  garage: { current: 'kona.garage.v1', legacy: ['speedmax.garage.v1'] },
  progression: { current: 'kona.progression.v1', legacy: ['speedmax.progression.v1'] },
  raceIdentity: { current: 'kona.raceIdentity.v1', legacy: ['speedmax.raceIdentity.v1'] },
  userEquipment: { current: 'kona.userEquipment.v1', legacy: ['speedmax.userEquipment.v1'] },
  konaSelf: { current: 'kona.konaSelf.v1', legacy: ['speedmax.konaSelf.v1'] },
  entryIntent: { current: 'kona.entryIntent.v1', legacy: ['speedmax.entryIntent.v1'] },
  raceHistory: { current: 'kona.raceHistory.v1', legacy: ['speedmax.raceHistory.v1'] },
  onboarding: { current: 'kona.onboarding.v1', legacy: [] },
  onboardingCards: { current: 'kona.onboarding.cards.v1', legacy: [] },
  returnJourney: { current: 'kona.returnJourney.v1', legacy: [] },
  surpriseState: { current: 'kona.surpriseState.v1', legacy: [] },
  countdown: { current: 'kona.countdown.v1', legacy: [] },
  entryPreview: { current: 'kona.entryPreview.v1', legacy: [] },
  otpCooldown: { current: 'kona.supabase.otp.cooldown.v1', legacy: [] },
  session: { current: 'kona.supabase.session.v1', legacy: ['kona.supabase.session.v1'] },
  companionSources: { current: 'kona.companion.sources.v1', legacy: [] },
  companionTravel: { current: 'kona.companion.travel.v1', legacy: [] },
  companionCache: { current: 'kona.companion.cache.v1', legacy: [] },
});

export function storageKey(name) {
  const row = MAP[name];
  if (!row) throw new Error(`Unknown storage key: ${name}`);
  return row.current;
}

// Read every compatible record for state that needs a lossless merge.
export function readStorageVersions(name, storage = globalThis.localStorage) {
  const row = MAP[name];
  if (!row) throw new Error(`Unknown storage key: ${name}`);
  return [...new Set([...row.legacy, row.current])].flatMap(key => {
    try { const value = storage?.getItem?.(key); return value == null ? [] : [value]; }
    catch { return []; }
  });
}

export function readStorage(name, storage = globalThis.localStorage) {
  const row = MAP[name];
  if (!row) throw new Error(`Unknown storage key: ${name}`);
  let current = null;
  try { current = storage?.getItem?.(row.current) ?? null; } catch (_) { globalThis.__konaAnalytics?.trackRuntimeError?.('state_read',{subsystem:'storage'}); }
  if (current != null) return current;
  for (const legacy of row.legacy) {
    if (legacy === row.current) continue;
    let value = null;
    try { value = storage?.getItem?.(legacy) ?? null; } catch (_) {}
    if (value == null) continue;
    try { storage?.setItem?.(row.current, value); } catch (_) {}
    return value;
  }
  return null;
}

export function writeStorage(name, value, storage = globalThis.localStorage) {
  const row = MAP[name];
  if (!row) throw new Error(`Unknown storage key: ${name}`);
  if(!storage)return false;
  try {
    if (value == null) storage?.removeItem?.(row.current);
    else storage?.setItem?.(row.current, String(value));
    announceStateChange(name,value==null?'remove':'write');
    return true;
  } catch (_) { globalThis.__konaAnalytics?.trackRuntimeError?.('state_write',{subsystem:'storage'}); return false; }
}

export function removeStorage(name, storage = globalThis.localStorage) {
  const row = MAP[name];
  if (!row) throw new Error(`Unknown storage key: ${name}`);
  let changed=false;
  try { if(storage?.getItem?.(row.current)!=null)changed=true; storage?.removeItem?.(row.current); } catch (_) {}
  for (const legacy of row.legacy) {
    if (legacy === row.current) continue;
    try { if(storage?.getItem?.(legacy)!=null)changed=true; storage?.removeItem?.(legacy); } catch (_) {}
  }
  if(changed)announceStateChange(name,'remove');
}

export function migrateStorage(storage = globalThis.localStorage) {
  const migrated = [];
  for (const [name,row] of Object.entries(MAP)) {
    if (row.area === 'session') continue;
    if (row.legacy.every(k => k === row.current)) continue;
    let hasCurrent = false;
    try { hasCurrent = storage?.getItem?.(row.current) != null; } catch (_) {}
    if (hasCurrent) continue;
    for (const legacy of row.legacy) {
      let value = null;
      try { value = storage?.getItem?.(legacy) ?? null; } catch (_) {}
      if (value == null) continue;
      try { storage?.setItem?.(row.current, value); } catch (_) {}
      migrated.push({ name, from: legacy, to: row.current });
      break;
    }
  }
  return migrated;
}

export function storageRegistry() {
  return JSON.parse(JSON.stringify(MAP));
}

export function storageNames() {
  return Object.keys(MAP);
}

export function storageKeys({ includeLegacy = false, area = 'local' } = {}) {
  const keys = [];
  for (const row of Object.values(MAP)) {
    if ((row.area || 'local') !== area) continue;
    keys.push(row.current);
    if (includeLegacy) keys.push(...row.legacy);
  }
  return [...new Set(keys)];
}
