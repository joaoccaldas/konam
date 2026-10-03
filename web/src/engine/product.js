// engine/product.js — one shared read model for every product across the app.
// The museum room, the Studio setup, the Passport collectible and the commerce action
// all read the SAME record here, instead of four partial copies drifting apart.
// Pure data + light joins; no THREE, so it runs on the build side and at runtime.
//
// Sources joined (in order of specificity):
//   public-catalog.json  — shipped, public products (bikes + atlas types)
//   candidate-products.json — intake candidates (Cervélo, Nike…) gated by readiness/blockers
//   brand_rooms.json — room placement, station, and room copy. A placed product
//   clears intake blockers. Identity and commerce stay on the product record.
import { canonicalProductId } from './identity.js';

export const CAPABILITY = ['inspect', 'collect', 'compare', 'equip', 'share', 'buy', 'customize', 'visit'];

const placedProductId = p => p?.id || p?.product_id || null;

// Hall object roomscene.js and the brand card read. The authored room file still
// ships the inline product. Callers may switch to this projection only after it
// deep-equals that object. Room copy and the public capability list stay on the
// ref. Brand, model, year, asset, stats, legal, and buy stay on the record.
export function projectHallProduct(record, ref) {
  const id = placedProductId(ref);
  if (!record || !id || record.id !== id) return null;
  const glb = record.asset_path || record.glb || record.asset || null;
  if (typeof glb !== 'string' || !/\.glb$/i.test(glb)) return null;
  const sources = Array.isArray(record.source_records) ? record.source_records : [];
  const story = ref.room_story || {};
  return {
    id,
    brand: record.brand ?? null,
    model: record.model ?? null,
    type: record.type || record.product_type || null,
    year: record.year ?? null,
    glb,
    sub: story.sub ?? null,
    text: story.text ?? null,
    source: (typeof record.source === 'string' && record.source) || sources.find(s => typeof s === 'string') || null,
    buy: record.buy ?? null,
    legal: record.legal ?? record.public_claim ?? null,
    stats: Array.isArray(record.stats) ? record.stats.map(row => Array.isArray(row) ? row.slice() : row) : [],
    station: ref.station ? { ...ref.station } : null,
    capabilities: Array.isArray(ref.capabilities) ? ref.capabilities.slice() : [],
  };
}

// Resolve the single display/behaviour record for a product id.
// Returns null if the product is unknown or still blocked for public use.
export function resolveProduct(id, { catalog = {}, candidates = {}, brandrooms = {} } = {}, { includeBlocked = false } = {}) {
  if (!id) return null;
  const room = (brandrooms.rooms || []).find(r => (r.products || []).some(p => placedProductId(p) === id));
  const roomProduct = room ? room.products.find(p => placedProductId(p) === id) : null;
  const pub = (catalog.products || catalog.items || []).find(p => p.id === id) || null;
  const cand = (candidates.items || []).find(p => p.id === id) || null;
  const base = pub || cand || roomProduct;
  if (!base) return null;

  const blocked = Array.isArray(base.blockers) && base.blockers.length > 0;
  // A product explicitly placed in a shipping brand room IS the cleared bar — the intake
  // candidate record may still carry stale blockers ("asset branch checks failing") that
  // predate the placement. Only hide truly-unplaced blocked candidates.
  const readiness = roomProduct ? 'room' : (base.readiness || (pub ? 'public' : 'candidate'));
  if (blocked && !roomProduct && !includeBlocked) return null;    // blocked candidate with no placement stays hidden

  const type = base.product_type || base.type || roomProduct?.type || 'gear';
  return {
    id,
    canonical_id: canonicalProductId(id),
    legacy_ids: String(id).startsWith('product:') ? [] : [id],
    brand: base.brand || roomProduct?.brand || null,
    model: base.model || roomProduct?.model || base.label || null,
    type,
    year: base.year ?? roomProduct?.year ?? null,
    asset: base.asset || base.asset_path || roomProduct?.glb || null,
    capabilities: [...new Set([...(base.capabilities || []), ...(roomProduct?.capabilities || [])])],
    setupSlot: base.setup_slot || { bike: 'bike', shoe: 'shoe', wheel: 'wheel', helmet: 'helmet' }[type] || null,
    representation: base.representation || roomProduct?.representation || 'study',
    sources: [...(base.source_records || []), ...(roomProduct?.source ? [roomProduct.source] : [])],
    // commerce (only if the room/product declares it — kept explicit so a study never silently sells)
    buy: roomProduct?.buy || base.buy || null,
    legal: roomProduct?.legal || base.public_claim || null,
    // placement
    room: room ? room.id : (base.locations?.[0] || null),
    roomProduct,
    readiness,
    blocked,
    public: base.public !== false && readiness === 'public',
  };
}

// All products the app should treat as live, deduped by id.
export function listProducts(sources, opts) {
  const ids = new Set([...(sources.catalog?.products || []).map(p => p.id), ...(sources.candidates?.items || []).map(p => p.id),
    ...(sources.brandrooms?.rooms || []).flatMap(r => (r.products || []).map(placedProductId))]);
  return [...ids].map(id => resolveProduct(id, sources, opts)).filter(Boolean);
}

// What fits a given setup slot, for the Studio picker.
export const productsForSlot = (slot, sources, opts) => listProducts(sources, opts).filter(p => p.setupSlot === slot && p.asset);

// What can be collected in the Passport (has a place to find it).
export const collectibles = (sources, opts) => listProducts(sources, opts).filter(p => p.room && p.asset);
