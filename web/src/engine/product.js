// engine/product.js — one shared read model for every product across the app.
// The museum room, the Studio setup, the Passport collectible and the commerce action
// all read the SAME record here, instead of four partial copies drifting apart.
// Pure data + light joins; no THREE, so it runs on the build side and at runtime.
//
// Sources joined (in order of specificity):
//   public-catalog.json  — shipped, public products (bikes + atlas types)
//   candidate-products.json — intake candidates (Cervélo, Nike…) gated by readiness/blockers
//   brand_rooms.json — room placement + commerce/affiliate + legal text per product
import { canonicalProductId } from './identity.js';

export const CAPABILITY = ['inspect', 'collect', 'compare', 'equip', 'share', 'buy', 'customize', 'visit'];

// Resolve the single display/behaviour record for a product id.
// Returns null if the product is unknown or still blocked for public use.
export function resolveProduct(id, { catalog = {}, candidates = {}, brandrooms = {} } = {}, { includeBlocked = false } = {}) {
  const room = (brandrooms.rooms || []).find(r => (r.products || []).some(p => p.id === id));
  const roomProduct = room ? room.products.find(p => p.id === id) : null;
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
    ...(sources.brandrooms?.rooms || []).flatMap(r => (r.products || []).map(p => p.id))]);
  return [...ids].map(id => resolveProduct(id, sources, opts)).filter(Boolean);
}

// What fits a given setup slot, for the Studio picker.
export const productsForSlot = (slot, sources, opts) => listProducts(sources, opts).filter(p => p.setupSlot === slot && p.asset);

// What can be collected in the Passport (has a place to find it).
export const collectibles = (sources, opts) => listProducts(sources, opts).filter(p => p.room && p.asset);
