import { storageKeys, storageKey } from './storage.js';
// engine/app-state.js — one registry for all local-only app state.
//
// Domain modules keep owning validation and business rules. This layer owns privacy operations:
// enumerate, export, and erase every browser record that belongs to this app.
// No network calls, cookies, identifiers, or third-party storage.

export const APP_STATE_SCHEMA_VERSION = 1;

export const APP_STATE_KEYS = Object.freeze([
  ...storageKeys({ includeLegacy:true }),
  'speedmax.coach.v1',
  'speedmax.atlas.hint',
  'speedmax.exp.tut.v1',
  'speedmax.hist.tut.v1',
]);

export const APP_STATE_PREFIXES = Object.freeze([
  'speedmax.museum.v2.',
]);

const owned = key => APP_STATE_KEYS.includes(key) || APP_STATE_PREFIXES.some(p => key.startsWith(p));

export function listAppState(storage = globalThis.localStorage) {
  const rows = [];
  if (!storage) return rows;
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key || !owned(key)) continue;
      const value = storage.getItem(key);
      rows.push({ key, value: value ?? '' });
    }
  } catch (_) {}
  return rows.sort((a, b) => a.key.localeCompare(b.key));
}

export function exportAppState(storage = globalThis.localStorage) {
  const entries = Object.fromEntries(listAppState(storage).filter(({key})=>key!==storageKey('session')).map(({ key, value }) => [key, value]));
  return JSON.stringify({
    schema_version: APP_STATE_SCHEMA_VERSION,
    scope: 'canyonmuseum-local-state',
    exported_at: new Date().toISOString(),
    entries,
  }, null, 2);
}

export function eraseAppState(storage = globalThis.localStorage) {
  if (!storage) return 0;
  const keys = listAppState(storage).map(x => x.key);
  let removed = 0;
  for (const key of keys) {
    try { storage.removeItem(key); removed++; } catch (_) {}
  }
  return removed;
}

export function appStateSummary(storage = globalThis.localStorage) {
  const rows = listAppState(storage);
  return {
    records: rows.length,
    bytes: rows.reduce((n, x) => n + x.key.length + x.value.length, 0),
    keys: rows.map(x => x.key),
  };
}
