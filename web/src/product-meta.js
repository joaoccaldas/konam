import meta from '../../config/product-meta.json' with { type: 'json' };

export const PRODUCT_NAME = String(meta.product_name || 'Kona.m');
export const PRODUCT_TAGLINE = String(meta.product_tagline || "Race the version of yourself you haven't met yet.");
export const HISTORICAL_COLLECTION = String(meta.historical_collection || 'Canyon Museum');
export const LEGACY_CONSUMER_NAME = String(meta.legacy_consumer_name || 'KONA');
export const PRODUCT_META = Object.freeze({...meta});
