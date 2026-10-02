// engine/garage.js — canonical UserEquipment projection.
// Garage is a view over userEquipment, never a second ownership database.
import { readStorage, writeStorage } from './storage.js';
import { canonicalProductId, equipmentRecord } from './identity.js';
import { ensureProgression } from './progression.js';

export const EQUIPMENT_RELATIONSHIPS = Object.freeze(['owned','dream','try']);

const normalize = raw => {
  if (!raw || typeof raw !== 'object') return null;
  const relationship = EQUIPMENT_RELATIONSHIPS.includes(raw.relationship) ? raw.relationship : null;
  const product = raw.product_id || raw.productId;
  if (!relationship || !product) return null;
  return {
    ...raw,
    schema_version: 1,
    entity_type: 'user-equipment',
    product_id: canonicalProductId(product),
    relationship,
    visibility: raw.visibility || 'private',
    vendor_analytics_eligible: false,
  };
};

export function readGarage(storage = globalThis.localStorage) {
  try {
    const rows = JSON.parse(readStorage('userEquipment', storage) || '[]');
    return Array.isArray(rows) ? rows.map(normalize).filter(Boolean) : [];
  } catch (_) { return []; }
}

export function addToGarage(product, { relationship='dream', storage=globalThis.localStorage } = {}) {
  if (!EQUIPMENT_RELATIONSHIPS.includes(relationship)) throw new Error('Invalid garage relationship');
  const productId = canonicalProductId(product);
  const items = readGarage(storage);
  if(relationship==='owned' && ensureProgression(storage).level < 2) return {items,item:null,added:false,locked:true,required_level:2};
  const existing = items.find(x => x.product_id === productId && x.relationship === relationship);
  if (existing) return { items, item:existing, added:false };
  const item = equipmentRecord({ product:{ id:productId }, relationship });
  const next = [...items, item];
  writeStorage('userEquipment', JSON.stringify(next), storage);
  return { items:next, item, added:true };
}

export function removeFromGarage(id, storage = globalThis.localStorage) {
  const next = readGarage(storage).filter(x => x.id !== id);
  writeStorage('userEquipment', JSON.stringify(next), storage);
  return next;
}

export function groupGarage(items = readGarage()) {
  const out = { owned:[], dream:[], try:[] };
  for (const x of items) if (out[x.relationship]) out[x.relationship].push(x);
  return out;
}
