export const FRESH_HOURS=3;
export const CORE_KINDS=['news','kona'];

export function isFresh(result){
  return result?.status==='ok'&&Number.isFinite(result?.age_hours)&&result.age_hours<=FRESH_HOURS;
}

export function assessCompanionHealth(results){
  const rows=Array.isArray(results)?results:[];
  const core=rows.filter(r=>CORE_KINDS.includes(r.kind));
  const videos=rows.filter(r=>r.kind==='video');
  const missingCriticalKinds=CORE_KINDS.filter(kind=>!rows.some(r=>r.kind===kind&&isFresh(r)));
  const coreUnavailable=core.filter(r=>!isFresh(r));
  const videoUnavailable=videos.filter(r=>!isFresh(r));
  const failureReasons=[];
  if(missingCriticalKinds.length)failureReasons.push('no fresh '+missingCriticalKinds.join(' or ')+' source in the current probe');
  if(core.length&&coreUnavailable.length>core.length/2)failureReasons.push('more than half of core news/Kona sources are unavailable in the current probe');
  const warnings=[];
  if(coreUnavailable.length&&!failureReasons.length)warnings.push(coreUnavailable.length+' core source(s) degraded');
  if(videoUnavailable.length)warnings.push(videoUnavailable.length+'/'+videos.length+' athlete-video source(s) degraded');
  return {
    status:failureReasons.length?'FAIL':warnings.length?'WARN':'PASS',
    failure_reasons:failureReasons,
    warnings,
    core_total:core.length,
    core_fresh:core.filter(isFresh).length,
    video_total:videos.length,
    video_fresh:videos.filter(isFresh).length,
    core_unavailable:coreUnavailable,
    video_unavailable:videoUnavailable
  };
}
