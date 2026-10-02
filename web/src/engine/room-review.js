import norwegian from '../../../world/konam/rooms/norwegian-engine.room.json' with { type: 'json' };

const CANDIDATES=Object.freeze({
  [norwegian.id]:norwegian,
});

const LOCAL_HOSTS=new Set(['localhost','127.0.0.1','::1']);

export function roomReviewAreas(areas,{
  reviewId=globalThis.__KONA_REVIEW_ROOM,
  hostname=globalThis.location?.hostname || ''
}={}){
  if(!reviewId || !LOCAL_HOSTS.has(hostname))return areas;
  const manifest=CANDIDATES[reviewId];
  if(!manifest?.review?.local_only || manifest.classification?.public)return areas;
  const replace=manifest.review.replace_area;
  const target=areas.find(a=>a.id===replace);
  if(!target?.presentation)return areas;
  const presentation={
    ...target.presentation,
    ...manifest.review.presentation,
    z0:target.presentation.z0,
    z1:target.presentation.z1,
  };
  const candidate={
    ...target,
    id:`room-${manifest.id}`,
    name:manifest.name,
    short:manifest.name.replace(/^NOR \/\/ 3 · /,''),
    sub:manifest.story?.sub || manifest.story?.concept || '',
    text:manifest.story?.concept || '',
    exhibits:{},
    presentation,
    review_candidate:true,
  };
  return areas.map(a=>a.id===replace?candidate:a);
}
