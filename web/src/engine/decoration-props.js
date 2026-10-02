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
