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

export function roomOverview(area,{upperY=4.7,groundY=1.6,isWalkable=()=>true,floorAt=null}={}){
  if(!area) return null;
  if(area.overview?.to && area.overview?.face && isWalkable(area.overview.to.x,area.overview.to.z)){
    const y=floorAt?floorAt(area.overview.to.x,area.overview.to.z)+groundY:area.overview.face.y;
    return {...area.overview,roomId:area.id,face:{...area.overview.face,y}};
  }
  const {w,d}=span(area);
  const cx=mid(area.x0,area.x1),cz=mid(area.z0,area.z1);
  const inset=Math.max(.9,Math.min(1.4,Math.min(w,d)*.12));
  const x0=Math.min(area.x0,area.x1)+inset,x1=Math.max(area.x0,area.x1)-inset;
  const z0=Math.min(area.z0,area.z1)+inset,z1=Math.max(area.z0,area.z1)-inset;
  const alongZ=[{x:cx,z:z1},{x:cx,z:z0}],alongX=[{x:x0,z:cz},{x:x1,z:cz}];
  // Try the opposite end and other edges before corners. Never aim at our own position.
  const candidates=[...(d>=w?[...alongZ,...alongX]:[...alongX,...alongZ]),{x:x0,z:z0},{x:x1,z:z0},{x:x0,z:z1},{x:x1,z:z1}];
  const to=candidates.find(p=>Math.hypot(p.x-cx,p.z-cz)>.5&&isWalkable(p.x,p.z));
  if(!to)return null;
  const y=floorAt?floorAt(to.x,to.z)+groundY:area.floor==='upper'?upperY:groundY;
  return {to,face:{x:cx,y,z:cz},roomId:area.id};
}

export function roomOverviewFov(area,overview,{width,fullHeight,minFov=48,maxFov=135}){
  const dx=overview.face.x-overview.to.x,dz=overview.face.z-overview.to.z,dist=Math.hypot(dx,dz);
  let tangent=0;
  for(const x of [area.x0,area.x1])for(const z of [area.z0,area.z1]){
    const ox=x-overview.to.x,oz=z-overview.to.z,depth=(ox*dx+oz*dz)/dist;
    if(depth>dist*.5)tangent=Math.max(tangent,Math.abs((ox*dz-oz*dx)/dist)/depth);
  }
  return Math.max(minFov,Math.min(maxFov,2*Math.atan(tangent*1.08*fullHeight/width)*180/Math.PI));
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
