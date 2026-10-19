// Evidence-backed, size-specific geometry comparison. A missing value stays UNKNOWN, never zero.
// Source records are candidates until reviewed. No physical bike identity or registry is created.
export const GEOMETRY_METRICS = Object.freeze({
  stack: { unit: 'mm', definition: 'frame-stack-v1' },
  reach: { unit: 'mm', definition: 'frame-reach-v1' },
  wheelbase: { unit: 'mm', definition: 'wheelbase-v1' },
});
const nonEmpty = x => typeof x === 'string' && Boolean(x.trim());
const unknown = reason => ({ status: 'unknown', value: null, reason });
const validSource = x => x?.review_status === 'verified'
  && nonEmpty(x.source_ref) && nonEmpty(x.source_locator);

export function auditedGeometryCell(records, selection, metric) {
  const expected = GEOMETRY_METRICS[metric];
  if (!expected) return unknown('unsupported metric');
  if (!selection || !nonEmpty(selection.productId) || !nonEmpty(selection.frameSize)
    || !Number.isInteger(selection.modelYear) || !nonEmpty(selection.buildRevision)) return unknown('incomplete selected variant');
  if (!Array.isArray(records)) return unknown('geometry records missing');
  const matches = records.filter(r => r.product_id === selection.productId && r.frame_size === selection.frameSize
    && r.model_year === selection.modelYear && r.build_revision === selection.buildRevision);
  const verified = matches.flatMap(r => Array.isArray(r.dimensions) ? r.dimensions : [])
    .filter(x => x.metric === metric && x.definition === expected.definition
      && x.unit === expected.unit && Number.isFinite(x.value) && x.value > 0 && validSource(x));
  if (!verified.length) return unknown('no reviewed, size-specific comparable geometry');
  if (new Set(verified.map(x => x.value)).size > 1) return unknown('conflicting reviewed geometry measurements');
  const first = verified[0];
  return { status: 'verified', value: first.value, unit: expected.unit, definition: expected.definition,
    source_refs: [...new Set(verified.map(x => x.source_ref))],
    source_locators: [...new Set(verified.map(x => x.source_locator))] };
}

export function compareGeometry({ catalog, selections, geometryRecords = [] } = {}) {
  if (!Array.isArray(catalog?.products) || !Array.isArray(selections) || selections.length !== 2)
    throw new Error('catalog products and exactly two selections required');
  const byId = new Map(catalog.products.map(p => [p.id, p]));
  const result = selections.map(s => {
    const p = byId.get(s?.productId);
    const baseProductId = p?.origin === 'museum-edition' && p?.base ? p.base : p?.id;
    // Editions are visualizations only; the source size/year/revision must be supplied explicitly.
    const q = { ...s, productId: baseProductId };
    return { selection: s, baseProductId: baseProductId || null,
      metrics: Object.fromEntries(Object.keys(GEOMETRY_METRICS).map(k => [k,
        p ? auditedGeometryCell(geometryRecords, q, k) : unknown('product not in canonical catalog')])) };
  });
  const deltas = Object.fromEntries(Object.keys(GEOMETRY_METRICS).map(k => [k,
    result.every(x => x.metrics[k].status === 'verified')
      ? { status: 'verified', value: Number((result[1].metrics[k].value - result[0].metrics[k].value).toFixed(3)), unit: 'mm' }
      : unknown('one or both comparable facts unknown')]));
  return { schema_version: 1, comparisons: result, deltas,
    note: 'Differences are geometry measurements, not fit, comfort, speed or safety recommendations.' };
}
