// Reusable prop builders. Every host supplies its group/collision/animation registries.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import catalog from '../../../museum/world/decorations.json' with { type: 'json' };

function palmFactory({group,lite=false,obstacles=[],sway=[],basaltTex=null}){
  const potM = new THREE.MeshStandardMaterial({ map: basaltTex, color: '#9a938c', roughness: .6 });
  const trunkM = new THREE.MeshStandardMaterial({ color: '#9b8467', roughness: .95 });
  const leafM = new THREE.MeshStandardMaterial({ color: '#3e7a4c', roughness: .7, side: THREE.DoubleSide });
  const leaf = (() => { const len = 1.35, g = new THREE.PlaneGeometry(len, .34, 12, 2), pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) { const u = (pos.getX(i) + len / 2) / len, y = pos.getY(i);
      pos.setY(i, y * Math.sin(Math.PI * Math.min(1, u * 1.1)) * (1 - u * .3)); pos.setZ(i, -u * u * len * .5 + Math.abs(y) * .2); pos.setX(i, u * len); }
    g.computeVertexNormals(); g.rotateX(-Math.PI / 2); return g; })();
  const pot = new THREE.CylinderGeometry(.34, .27, .56, 28), soil = new THREE.CircleGeometry(.31, 20);
  return function pottedPalm(x, z, h = 2.3, seed = 1) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const pm = new THREE.Mesh(pot, potM); pm.position.y = .28; pm.castShadow = !lite; g.add(pm);
    const sl = new THREE.Mesh(soil, new THREE.MeshStandardMaterial({ color: '#3b2f27', roughness: 1 })); sl.rotation.x = -Math.PI / 2; sl.position.y = .545; g.add(sl);
    const stems = [], leaves = [], o = new THREE.Object3D();                // merged: one mesh for stems, one for leaves
    for (let s2 = 0; s2 < 3; s2++) {                                   // a small clump of stems
      const lean = (s2 - 1) * .22 + Math.sin(seed * 3.1) * .08, hh = h * (1 - s2 * .12);
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, .5, 0), new THREE.Vector3(lean * .4, .5 + hh * .5, s2 * .05 - .05), new THREE.Vector3(lean, .5 + hh, s2 * .1 - .1)]);
      stems.push(new THREE.TubeGeometry(curve, 10, .035, 6));
      const top = curve.getPoint(1);
      for (let i = 0; i < 9; i++) {
        o.position.copy(top); o.rotation.set(0, i / 9 * Math.PI * 2 + s2 + seed, 0); o.rotateZ(.35 - ((i * 7 + seed * 13) % 5) * .09); o.updateMatrix();
        leaves.push(leaf.clone().applyMatrix4(o.matrix));
      }
    }
    g.add(new THREE.Mesh(mergeGeometries(stems), trunkM));
    const crown = new THREE.Mesh(mergeGeometries(leaves), leafM); crown.castShadow = !lite; g.add(crown);
    for(const geometry of [...stems,...leaves])geometry.dispose();
    sway.push({ o: crown, phase: seed * 1.7, amp: .012, pivot: true });
    group.add(g); obstacles.push({ c: new THREE.Vector3(x, 0, z), r: .55 }); return g;
  }

}
function raceMarkerFactory({group}){
 const stone=new THREE.MeshStandardMaterial({color:'#222a2e',roughness:.82});
 const colors=['#5fd8d3','#ff6427','#c9a6db'];
 return (x,z,height=1.2,seed=1)=>{
  const g=new THREE.Group();g.name='swim-bike-run';g.position.set(x,0,z);
  for(let i=0;i<3;i++){
   const p=new THREE.Mesh(new THREE.BoxGeometry(.12,height*(.65+i*.175),.12),stone);
   p.position.set((i-1)*.22,height*(.65+i*.175)/2,0);g.add(p);
   const ring=new THREE.Mesh(new THREE.TorusGeometry(.08,.014,6,24),new THREE.MeshStandardMaterial({color:colors[i],roughness:.4,emissive:colors[i],emissiveIntensity:.25}));
   ring.position.set(p.position.x,p.position.y*2+.14,0);g.add(ring);
  }
  group.add(g);return g;
 };
}
const FACTORIES=Object.freeze({palm:palmFactory,'race-marker':raceMarkerFactory});
// Explicit instances only: no random geometry, networking, or extra point lights.
// The registry defines defaults. Hosts own absolute room coordinates and lifecycle.
export function decorateRoom(placements,ctx){
 const factories=new Map();
 return (placements||[]).map(p=>{
  const def=catalog.props.find(d=>d.id===p.prop);
  if(!def||!FACTORIES[def.builder])throw new Error(`Unknown decoration: ${p.prop}`);
  if(!factories.has(def.builder))factories.set(def.builder,FACTORIES[def.builder](ctx));
  const g=factories.get(def.builder)(p.x,p.z,p.height??def.height,p.seed??1);
  g.name=`decor-${p.prop}`;g.userData.decoration=p.prop;
  if(p.y)g.position.y+=p.y;
  if(p.rotation)g.rotation.y=p.rotation;
  return g;
 });
}

// ---------------------------------------------------------------- instanced props
// One InstancedMesh per part for every placement: eleven chairs or four lamps cost one draw call per part.
// Parts are built in prop-local space (origin on the floor, facing +x); each placement adds {x, z, y?, rotation?}.
// Hosts may swap a part's material (hooks.material(partName, defaultMaterial)) to register it for env capture or to
// restyle it, and get a contact-shadow footprint per placement when they pass their contactShadow(w, d) helper.
function promenadeChairGeometry(lite){
 const p=[],RS=lite?5:8,TS=lite?10:22;
 const tube=pts=>p.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(([x,y,z])=>new THREE.Vector3(x,y,z))),TS,.014,RS).toNonIndexed());
 for(const sx of [-.25,.25]){                                        // side frames: front leg into the armrest, back leg into the back post
  tube([[sx,0,.24],[sx,.3,.23],[sx,.6,.2],[sx,.63,.05],[sx,.64,-.12]]);
  tube([[sx,0,-.26],[sx,.32,-.2],[sx,.62,-.3],[sx,.95,-.42]]);}
 tube([[-.25,.34,.2],[0,.345,.2],[.25,.34,.2]]);tube([[-.25,.3,-.2],[0,.3,-.2],[.25,.3,-.2]]);
 const slat=(w,len,bend,segs)=>{const g=new THREE.BoxGeometry(w,.016,len,1,1,segs),q=g.attributes.position;for(let k=0;k<q.count;k++){const z=q.getZ(k)/len*2;q.setY(k,q.getY(k)-bend*(1-z*z));}g.computeVertexNormals();return g.toNonIndexed();};
 for(let i=0;i<6;i++){const g=slat(.07,.46,.025,lite?3:6);g.translate(-.18+i*.072,.37,0);g.rotateX(-.06);p.push(g);}                  // a dished seat
 for(let i=0;i<6;i++){const g=slat(.07,.5,.03,lite?3:6);g.rotateX(Math.PI/2-.4);g.translate(-.18+i*.072,.72,-.33);p.push(g);}       // a reclined, curved back
 const g=mergeGeometries(p);g.rotateY(-Math.PI/2);for(const x of p)x.dispose();return g;
}
let haloTexture=null;
function lampHaloTexture(){
 if(haloTexture)return haloTexture;
 const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),gr=g.createRadialGradient(64,64,2,64,64,64);
 gr.addColorStop(0,'rgba(255,220,160,.9)');gr.addColorStop(1,'rgba(255,220,160,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);
 haloTexture=new THREE.CanvasTexture(c);haloTexture.colorSpace=THREE.SRGBColorSpace;return haloTexture;
}
const INSTANCED=Object.freeze({
 'promenade-chair':({lite})=>[
  {name:'chair',geometry:promenadeChairGeometry(lite),material:new THREE.MeshPhysicalMaterial({color:'#2f6fae',roughness:.32,metalness:.55,clearcoat:.8,clearcoatRoughness:.15}),castShadow:true,receiveShadow:true}],
 'promenade-lamp':()=>{
  const post=mergeGeometries([new THREE.CylinderGeometry(.11,.15,.3,12).translate(0,.15,0),new THREE.CylinderGeometry(.04,.06,2.6,10).translate(0,1.6,0),new THREE.TorusGeometry(.09,.015,6,18).rotateX(Math.PI/2).translate(0,2.9,0),new THREE.ConeGeometry(.16,.14,12).translate(0,3.32,0)].map(g=>g.toNonIndexed()));
  return [
   {name:'post',geometry:post,material:new THREE.MeshStandardMaterial({color:'#1f2a28',roughness:.45,metalness:.6}),castShadow:true},
   {name:'globe',geometry:new THREE.SphereGeometry(.13,16,12),material:new THREE.MeshBasicMaterial({color:'#ffe3b0',toneMapped:false}),local:[0,3.1,0]},
   {name:'halo',geometry:new THREE.PlaneGeometry(.9,.9),material:new THREE.MeshBasicMaterial({map:lampHaloTexture(),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}),local:[-.1,3.1,0],yaw:-Math.PI/2}];
 },
});
export function instancedProps(prop,placements,{lite=false,obstacles=null,contactShadow=null,material=(name,m)=>m}={}){
 const def=catalog.props.find(d=>d.id===prop);
 if(!def||!def.instanced||!INSTANCED[def.builder])throw new Error(`Unknown instanced decoration: ${prop}`);
 const group=new THREE.Group();group.name=`decor-${prop}`;group.userData.decoration=prop;
 const meshes={},M=new THREE.Matrix4(),L=new THREE.Matrix4(),Q=new THREE.Quaternion(),E=new THREE.Euler(),V=new THREE.Vector3(),S=new THREE.Vector3(1,1,1);
 const place=(p,k,setter)=>{M.compose(V.set(p.x,p.y||0,p.z),Q.setFromEuler(E.set(0,p.rotation||0,0)),S);setter(k,M);};
 for(const part of INSTANCED[def.builder]({lite})){
  const mesh=new THREE.InstancedMesh(part.geometry,material(part.name,part.material),placements.length);
  const [lx,ly,lz]=part.local||[0,0,0];L.compose(V.set(lx,ly,lz),Q.setFromEuler(E.set(0,part.yaw||0,0)),S);
  placements.forEach((p,k)=>place(p,k,(i,m)=>mesh.setMatrixAt(i,m.clone().multiply(L))));
  mesh.castShadow=!!part.castShadow&&!lite;mesh.receiveShadow=!!part.receiveShadow;mesh.name=`${prop}-${part.name}`;
  meshes[part.name]=mesh;group.add(mesh);
 }
 if(contactShadow&&def.footprint){                                   // one soft footprint per placement, one draw for all of them
  const cs=contactShadow(...def.footprint);
  if(cs){const ci=new THREE.InstancedMesh(cs.geometry,cs.material,placements.length);ci.renderOrder=1;
   placements.forEach((p,k)=>{M.compose(V.set(p.x,.006,p.z),Q.setFromEuler(E.set(-Math.PI/2,0,p.rotation||0)),S);ci.setMatrixAt(k,M);});
   meshes.shadow=ci;group.add(ci);}
 }
 if(obstacles&&def.radius)for(const p of placements)obstacles.push({c:new THREE.Vector3(p.x,0,p.z),r:def.radius});
 return {group,meshes};
}

// Voile sheers that breathe in a sea breeze (vertex shader). One material serves every sheet; hosts advance uniform.value.
// top/span set where the cloth hangs from and how far the sway reaches (defaults: a 4.5 m drop under a 5.4 m ceiling).
export function voileMaterial({lite=false,color='#fbf6ee',top=2.6,span=5.2}={}){
 const uniform={value:0};
 const material=new THREE.MeshStandardMaterial({color,roughness:1,transparent:true,opacity:lite?.5:.62,side:THREE.DoubleSide,depthWrite:false});
 material.onBeforeCompile=sh=>{sh.uniforms.uT=uniform;sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float uT;')
  .replace('#include <begin_vertex>',`#include <begin_vertex>\nfloat hang=clamp((${top.toFixed(3)}-position.y)/${span.toFixed(3)},0.,1.);transformed.z+=(sin(position.x*5.+uT*1.3)*.07+sin(position.x*11.-uT*2.1)*.03)*hang*hang+hang*.05;`);};
 material.customProgramCacheKey=()=>`konam-voile-${top}-${span}`;
 const sheet=(width,height)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(width,height,lite?6:14,lite?8:20),material);m.renderOrder=2;m.name='decor-voile-sheer';return m;};
 return {material,uniform,sheet};
}
