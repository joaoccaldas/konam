// Read-only, fail-closed compatibility projection. Never infer a safe fit from brand or bike family.
// This is not a parts catalogue and does not override manufacturer safety documentation.
const nonEmpty = x => typeof x === 'string' && x.trim().length > 0;
const exactContext = (x) => Boolean(x && nonEmpty(x.bikeId) && nonEmpty(x.componentId)
  && nonEmpty(x.frameSize) && Number.isInteger(x.modelYear)
  && x.modelYear >= 1800 && x.modelYear <= 2200 && nonEmpty(x.buildRevision));
const isReviewedEvidence = r => r?.review_status === 'verified'
  && nonEmpty(r.source_ref) && nonEmpty(r.source_locator)
  && nonEmpty(r.reviewed_at) && !Number.isNaN(Date.parse(r.reviewed_at))
  && ['compatible', 'incompatible'].includes(r.result);

export function resolveCompatibility({ bikeId, componentId, frameSize, modelYear, buildRevision, rules = [] } = {}) {
  const context = { bikeId, componentId, frameSize, modelYear, buildRevision };
  if (!exactContext(context)) return { result: 'unknown', source_ref: null, reason: 'exact bike, component, frame size, year and build revision required' };
  if (!Array.isArray(rules)) return { result: 'unknown', source_ref: null, reason: 'invalid rules input' };
  const applicable = rules.filter(r => isReviewedEvidence(r)
    && r.bike_id === bikeId && r.component_id === componentId
    && r.frame_size === frameSize && r.model_year === modelYear
    && r.build_revision === buildRevision);
  if (!applicable.length) return { result: 'unknown', source_ref: null, reason: 'no reviewed exact-applicability evidence' };
  if (new Set(applicable.map(r => r.result)).size !== 1)
    return { result: 'unknown', source_ref: null, reason: 'conflicting reviewed compatibility rules' };
  return { result: applicable[0].result, source_ref: applicable[0].source_ref,
    source_locator: applicable[0].source_locator,
    rule_ids: applicable.map(r => r.id).filter(nonEmpty),
    reason: 'manufacturer documentation and safety notices still govern actual service' };
}
