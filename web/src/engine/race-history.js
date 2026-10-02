// Canonical personal race relationships. Metadata stays in the race catalog.
import { readStorage, writeStorage } from './storage.js';

export const RACE_RELATIONSHIPS = Object.freeze(['completed', 'registered', 'interested']);
const cleanRelation = value => RACE_RELATIONSHIPS.includes(value) ? value : 'interested';
const cleanId = value => typeof value === 'string' && value.trim().length <= 240 ? value.trim() : '';
function cleanResult(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const seconds = value.finish_time_seconds;
  return {
    finish_time_seconds: seconds != null && seconds !== '' && Number.isFinite(Number(seconds)) && Number(seconds) >= 0 ? Number(seconds) : null,
    bib: value.bib == null ? null : String(value.bib).slice(0, 20),
  };
}
function normalize(rows) {
  const out = [], seen = new Set();
  for (const row of Array.isArray(rows) ? rows : []) {
    const id = cleanId(row?.race_id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({race_id: id, relationship: cleanRelation(row.relationship), selected_at: typeof row.selected_at === 'string' ? row.selected_at : null, result: cleanResult(row.result)});
  }
  return out;
}
export function readRaceHistory(storage = globalThis.localStorage) {
  try { return normalize(JSON.parse(readStorage('raceHistory', storage) || '[]')); }
  catch { return []; }
}
export function writeRaceHistory(rows, storage = globalThis.localStorage) {
  const out = normalize(rows).map(row => ({...row, selected_at: row.selected_at || new Date().toISOString()}));
  if (!writeStorage('raceHistory', JSON.stringify(out), storage)) {
    throw new Error('Could not save your races on this device. Your previous race cards were kept.');
  }
  return out;
}
export function setRaceRelationship(raceId, relationship, storage = globalThis.localStorage) {
  const id = cleanId(raceId);
  if (!id) throw new Error('Choose a valid race.');
  if (!RACE_RELATIONSHIPS.includes(relationship)) throw new Error('Choose Completed, Registered or Interested.');
  const rows = readRaceHistory(storage);
  const existing = rows.find(row => row.race_id === id);
  if (existing?.relationship === relationship) return rows;
  // Changing a label must not erase the athlete's time, bib or original selection date.
  if (existing) return writeRaceHistory(rows.map(row => row.race_id === id ? {...row, relationship} : row), storage);
  return writeRaceHistory([...rows, {race_id: id, relationship, selected_at: new Date().toISOString(), result: null}], storage);
}
export function removeRace(raceId, storage = globalThis.localStorage) {
  return writeRaceHistory(readRaceHistory(storage).filter(row => row.race_id !== raceId), storage);
}
