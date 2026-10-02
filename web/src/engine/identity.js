import { readStorage, writeStorage, storageKey } from './storage.js';
// Canonical graph for the device. Product, equipment, and race identity stay separate.
// RaceSetup is persisted by storage.js; this module only projects setup state into the canonical graph.
// An unlabeled setup is relationship "try": it is not owned and it is not dream demand.
// Nothing here is eligible for vendor analytics. Tokens never live in these records.

export const RACE_IDENTITY_KEY = storageKey('raceIdentity');
export const USER_EQUIPMENT_KEY = storageKey('userEquipment');
export const LOCAL_USER_ID = 'user:local';

const RELATIONSHIPS = new Set(['owned', 'dream', 'try', 'former', 'borrowed', 'favorite']);
const MODES = new Set(['real', 'dream', 'surprise']);
const CATEGORIES = new Set(['bike', 'wheel', 'shoe', 'helmet', 'trisuit', 'watch', 'wetsuit', 'nutrition', 'hydration', 'sunglasses', 'component', 'other']);
const SETUP_FIELDS = {
  bike: 'bike',
  helmet: 'helmet',
  shoe: 'shoe',
  trisuit: 'trisuit',
  watch: 'watch',
  wetsuit: 'wetsuit',
  wheel_front: 'wheel_front',
  wheel_rear: 'wheel_rear',
};

const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9:_-]+/g, '-').replace(/^-+|-+$/g, '') || 'item';

export function canonicalProductId(productOrId) {
  const raw = typeof productOrId === 'string' ? productOrId : productOrId?.id;
  const id = slug(raw);
  return id.startsWith('product:') ? id : `product:${id}`;
}

export function canonicalProduct(record) {
  const legacy = typeof record?.id === 'string' ? record.id : '';
  const id = canonicalProductId(legacy || record);
  const category = CATEGORIES.has(record?.category) ? record.category
    : CATEGORIES.has(record?.type) ? record.type
    : CATEGORIES.has(record?.product_type) ? record.product_type
    : 'other';
  return {
    schema_version: 1,
    id,
    legacy_ids: legacy && legacy !== id ? [legacy] : [],
    entity_type: 'product',
    brand: record?.brand || null,
    name: record?.name || record?.model || legacy || id,
    model: record?.model || null,
    family: record?.family || null,
    year: Number.isInteger(record?.year) ? record.year : null,
    category,
    status: record?.status || 'published',
    sources: Array.isArray(record?.sources) ? record.sources : [],
  };
}

export function equipmentRecord({ userId = LOCAL_USER_ID, product, relationship = 'try', now = new Date().toISOString(), customization = {} } = {}) {
  const product_id = canonicalProductId(product);
  const rel = RELATIONSHIPS.has(relationship) ? relationship : 'try';
  const user_id = String(userId).startsWith('user:') ? slug(userId) && userId : `user:${slug(userId)}`;
  const who = slug(String(user_id).replace(/^user:/, ''));
  const what = slug(product_id.replace(/^product:/, ''));
  return {
    schema_version: 1,
    id: `equipment:${who}:${rel}:${what}`,
    entity_type: 'user-equipment',
    user_id,
    product_id,
    relationship: rel,
    created_at: now,
    nickname: null,
    customization,
    visibility: 'private',
    vendor_analytics_eligible: false,
  };
}

function slotProduct(setup, slot) {
  const raw = setup?.slots?.[slot];
  if (!raw?.product_id || raw.source === 'bike') return null;
  return raw.product_id;
}

/** Project a Race Setup V0 record into equipment rows plus one race identity. */
export function projectSetup(setup, products = [], { userId = LOCAL_USER_ID, mode = 'dream', relationship = 'try', now = new Date().toISOString() } = {}) {
  const byId = new Map((products || []).map(p => [p.id, p]));
  const equipment = [];
  const links = {
    bike: null, wheel_front: null, wheel_rear: null, helmet: null, shoe: null,
    trisuit: null, watch: null, wetsuit: null, nutrition: null,
  };
  const rel = RELATIONSHIPS.has(relationship) ? relationship : 'try';
  const fields = [
    ['bike', 'bike'],
    ['helmet', 'helmet'],
    ['shoe', 'shoe'],
    ['wheel', 'wheel_front'],
  ];
  for (const [slot, field] of fields) {
    if (!SETUP_FIELDS[field]) continue;
    const legacyId = slotProduct(setup, slot);
    if (!legacyId) continue;
    const product = byId.get(legacyId) || { id: legacyId, type: slot === 'wheel' ? 'wheel' : slot };
    const row = equipmentRecord({
      userId, product, relationship: rel, now,
      customization: { provenance: 'unlabeled-v0', look: setup.slots[slot]?.configuration?.look || '' },
    });
    equipment.push(row);
    links[field] = row.id;
  }
  const identity = {
    schema_version: 1,
    id: `race-identity:${slug(String(userId).replace(/^user:/, ''))}:kona-2026`,
    entity_type: 'race-identity',
    user_id: String(userId).startsWith('user:') ? userId : `user:${slug(userId)}`,
    mode: MODES.has(mode) ? mode : 'dream',
    event_id: 'event:kona-2026',
    goal: { type: 'experience', target_seconds: null, label: null },
    style: 'custom',
    avatar: { avatar_id: `avatar:${slug(String(userId).replace(/^user:/, ''))}`, appearance: {} },
    setup: links,
    visibility: 'private',
    share_slug: null,
  };
  return { equipment, identity };
}

const EMPTY_SETUP = {
  bike: null, wheel_front: null, wheel_rear: null, helmet: null, shoe: null,
  trisuit: null, watch: null, wetsuit: null, nutrition: null,
};

/** The first-minute quest. Owned, dream, and try stay separate. */
export function identityFromQuest(draft, { userId = LOCAL_USER_ID, now = new Date().toISOString() } = {}) {
  const intent = draft?.intent;
  const relationship = intent === 'racing' ? 'owned' : intent === 'dreaming' ? 'dream' : 'try';
  const mode = intent === 'racing' ? 'real' : intent === 'exploring' ? 'surprise' : 'dream';
  const equipment = [];
  const setup = { ...EMPTY_SETUP };
  for (const [field, id, type] of [['bike', draft?.bikeId, 'bike'], ['shoe', draft?.shoeId, 'shoe']]) {
    if (!id) continue;
    const row = equipmentRecord({
      userId, product: { id, type, category: type }, relationship, now,
      customization: { provenance: 'kona-self' },
    });
    equipment.push(row);
    setup[field] = row.id;
  }
  const who = slug(String(userId).replace(/^user:/, ''));
  return {
    equipment,
    identity: {
      schema_version: 1,
      id: `race-identity:${who}:kona-2026`,
      entity_type: 'race-identity',
      user_id: String(userId).startsWith('user:') ? userId : `user:${who}`,
      mode,
      event_id: 'event:kona-2026',
      goal: { type: 'experience', target_seconds: null, label: draft?.goal || null },
      style: 'custom',
      avatar: { avatar_id: `avatar:${who}`, appearance: {} },
      setup,
      visibility: 'private',
      share_slug: null,
      intent: intent || null,
    },
  };
}

export function saveQuestIdentity(draft, storage = globalThis.localStorage) {
  const graph = identityFromQuest(draft);
  try {
    writeStorage('userEquipment', JSON.stringify(graph.equipment), storage);
    writeStorage('raceIdentity', JSON.stringify(graph.identity), storage);
  } catch { /* the quest key still holds the answers */ }
  return graph;
}

export function syncIdentityFromSetup(setup, products, storage = globalThis.localStorage, options = {}) {
  const graph = projectSetup(setup, products, options);
  try {
    const previousEquipment = JSON.parse(readStorage('userEquipment', storage) || '[]');
    const previousIdentity = JSON.parse(readStorage('raceIdentity', storage) || 'null');
    const existingRows = Array.isArray(previousEquipment) ? previousEquipment : [];
    const chosenByProjectedId = new Map();
    const mergedEquipment = [...existingRows];

    for (const projected of graph.equipment) {
      const existing = existingRows.find(row => row?.product_id === projected.product_id && row?.relationship !== 'try')
        || existingRows.find(row => row?.product_id === projected.product_id);
      if (existing) {
        const merged = {
          ...projected,
          ...existing,
          customization: { ...(existing.customization || {}), ...(projected.customization || {}) },
        };
        const i = mergedEquipment.findIndex(row => row?.id === existing.id);
        if (i >= 0) mergedEquipment[i] = merged;
        chosenByProjectedId.set(projected.id, existing.id);
      } else {
        mergedEquipment.push(projected);
        chosenByProjectedId.set(projected.id, projected.id);
      }
    }

    const projectedSetup = Object.fromEntries(
      Object.entries(graph.identity.setup || {})
        .filter(([,id]) => id != null)
        .map(([field,id]) => [field, chosenByProjectedId.get(id) || id])
    );
    const identity = {
      ...graph.identity,
      ...(previousIdentity && typeof previousIdentity === 'object' ? {
        goal: previousIdentity.goal ?? graph.identity.goal,
        intent: previousIdentity.intent ?? graph.identity.intent,
        mode: previousIdentity.mode ?? graph.identity.mode,
        style: previousIdentity.style ?? graph.identity.style,
        avatar: previousIdentity.avatar ?? graph.identity.avatar,
        visibility: previousIdentity.visibility ?? graph.identity.visibility,
        share_slug: previousIdentity.share_slug ?? graph.identity.share_slug,
      } : {}),
      setup: { ...(previousIdentity?.setup || {}), ...projectedSetup },
    };

    const beforeEquipment = readStorage('userEquipment', storage), beforeIdentity = readStorage('raceIdentity', storage);
    if (!writeStorage('userEquipment', JSON.stringify(mergedEquipment), storage)) throw new Error('Equipment save failed');
    if (!writeStorage('raceIdentity', JSON.stringify(identity), storage)) {
      writeStorage('userEquipment', beforeEquipment, storage);
      writeStorage('raceIdentity', beforeIdentity, storage);
      throw new Error('Identity save failed');
    }
    return { equipment: mergedEquipment, identity };
  } catch {
    return { ...graph, persisted: false };
  }
}

/** Aggregate only. Refuses user ids and groups smaller than 10. */
export function sealVendorInsight(draft) {
  if (!draft || typeof draft !== 'object') return null;
  if (draft.contains_user_ids !== false) return null;
  if (draft.consent_basis !== 'explicit-opt-in') return null;
  const counts = draft.counts || {};
  const n = ['owned', 'dream', 'try', 'former', 'borrowed', 'favorite'].reduce((s, k) => s + (Number(counts[k]) || 0), 0);
  if (n < 10) return null;
  const blob = JSON.stringify(draft);
  if (/"user:|"equipment:/.test(blob)) return null;
  return {
    product_id: canonicalProductId(draft.product_id),
    counts: {
      owned: Number(counts.owned) || 0,
      dream: Number(counts.dream) || 0,
      try: Number(counts.try) || 0,
    },
    contains_user_ids: false,
    consent_basis: 'explicit-opt-in',
    minimum_group_size: 10,
  };
}
