// world/map-model.js — canonical map projection + room-overview policy.
// The renderer knows rectangles/status only. Product-specific room creation stays elsewhere.

const span=a=>({w:Math.abs(a.x1-a.x0),d:Math.abs(a.z1-a.z0)});
const mid=(a,b)=>(a+b)/2;

export const FUTURE_LEVELS=Object.freeze([
  {id:'future-performance-lab',name:'Performance Lab',sub:'Future level · testing and physiology',floor:'future',x0:-18,x1:-7,z0:8,z1:-2,color:'#44525a',status:'future',go:false},
  {id:'future-athlete-stories',name:'Athlete Stories',sub:'Future level · people and race identity',floor:'future',x0:-5.5,x1:5.5,z0:8,z1:-2,color:'#5b4c68',status:'future',go:false},
  {id:'future-innovation',name:'Innovation Wing',sub:'Future level · machines and materials',floor:'future',x0:7,x1:18,z0:8,z1:-2,color:'#4b5a3d',status:'future',go:false},
  {id:'future-course-worlds',name:'Course Worlds',sub:'Future level · race environments',floor:'future',x0:-18,x1:-5,z0:-5,z1:-16,color:'#315866',status:'future',go:false},
  {id:'future-partner-rooms',name:'Partner Rooms',sub:'Future level · curated collaborations',floor:'future',x0:-3.5,x1:9,z0:-5,z1:-16,color:'#67483c',status:'future',go:false},
  {id:'future-unknown',name:'Unannounced',sub:'Future level · locked',floor:'future',x0:10.5,x1:18,z0:-5,z1:-16,color:'#3b4348',status:'future',go:false},
]);

export function withFutureLevels(liveAreas=[]){
  return [...liveAreas.map(a=>({...a,status:a.status||'live'})),...FUTURE_LEVELS.map(a=>({...a}))];
}

export function roomOverview(area,{upperY=4.7,groundY=1.6}={}){
  if(!area) return null;
  if(area.overview?.to && area.overview?.face) return area.overview;
  const {w,d}=span(area);
  const cx=mid(area.x0,area.x1),cz=mid(area.z0,area.z1);
  const inset=Math.max(.9,Math.min(2.2,Math.min(w,d)*.18));
  let x=cx,z=cz;
  // Stand near the edge of the long axis so the first frame reveals the whole room.
  if(d>=w) z=Math.max(area.z0,area.z1)-inset;
  else x=Math.min(area.x0,area.x1)+inset;
  const y=area.floor==='upper'?upperY:groundY;
  return {to:{x,z},face:{x:cx,y,z:cz},roomId:area.id};
}

export function mapFloors(areas=[]){
  const order=['ground','upper','future'];
  const set=new Set(areas.map(a=>a.floor));
  return order.filter(x=>set.has(x)).concat([...set].filter(x=>!order.includes(x)));
}

export function mapBounds(areas=[],pad=3){
  const xs=areas.flatMap(a=>[a.x0,a.x1]),zs=areas.flatMap(a=>[a.z0,a.z1]);
  if(!xs.length) return {minX:-10,maxX:10,minZ:-10,maxZ:10};
  return {minX:Math.min(...xs)-pad,maxX:Math.max(...xs)+pad,minZ:Math.min(...zs)-pad,maxZ:Math.max(...zs)+pad};
}
