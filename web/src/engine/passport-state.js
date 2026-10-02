import { readStorageVersions, writeStorage } from './storage.js';

// One compatible record for world discoveries and the Experiences passport.
// Read both historic v1 shapes; never clear progress to repair a schema.
const record = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const count = value => Math.max(0, Number(value) || 0);
export function normalizePassport(value) {
  const raw = record(value);
  return {
    ...raw, v: 1, profile: raw.profile || null,
    discoveries: [...new Set((Array.isArray(raw.discoveries) ? raw.discoveries : []).filter(x => typeof x === 'string'))],
    visits: count(raw.visits), pose: raw.pose || null,
    stamps: record(raw.stamps), badges: record(raw.badges),
    xp: count(raw.xp), streak: count(raw.streak), best: count(raw.best), last: raw.last || null,
  };
}
export function readPassportState(storage = globalThis.localStorage) {
  return readStorageVersions('passport', storage).reduce((previous, value) => {
    try { return mergePassport(previous, normalizePassport(JSON.parse(value))); }
    catch { return previous; }
  }, normalizePassport(null));
}
function mergePassport(previous, next) {
  return {
    ...previous, ...next,
    discoveries: [...new Set([...previous.discoveries, ...next.discoveries])],
    stamps: { ...previous.stamps, ...next.stamps }, badges: { ...previous.badges, ...next.badges },
    xp: Math.max(previous.xp, next.xp), best: Math.max(previous.best, next.best),
    visits: Math.max(previous.visits, next.visits),
  };
}
export function savePassportState(value, storage = globalThis.localStorage) {
  const merged = mergePassport(readPassportState(storage), normalizePassport(value));
  if (!writeStorage('passport', JSON.stringify(merged), storage)) throw new Error('Progress could not be saved. Free device storage and try again.');
  return merged;
}
