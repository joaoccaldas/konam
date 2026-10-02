// Shoreline finds. Small objects left off the aisle — a plumeria, a cowrie, a lava stone,
// a scrap of black coral, a race bib. They are not on the rail. Tap one to keep it.
import * as THREE from 'three';
import { applyStoredEvent } from './engine/progression.js';

export const FINDS = [
  { id: 'plumeria', mesh: 'plumeria', name: 'A plumeria', line: 'Left by the chapel door, the colour of the late light on Aliʻi.', x: 2.35, z: 3.55, y: .02, yaw: .4 },
  { id: 'cowrie', mesh: 'cowrie', name: 'A cowrie', line: 'On the boards where the hall becomes the pier. The tide does not reach this far.', x: 2.55, z: -47.6, y: .02, yaw: 1.1 },
  { id: 'lava', mesh: 'lava_stone', name: 'A lava stone', line: 'Basalt from the Queen K shoulder, small enough to have been kicked aside.', x: 4.85, z: -16.2, y: .02, yaw: .2 },
  { id: 'coral', mesh: 'black_coral', name: 'Black coral', line: 'A dry fragment by the WYLD door. The reef is east of the glass.', x: -4.6, z: -28.4, y: .02, yaw: .8 },
  { id: 'bib', mesh: 'race_bib', name: 'A race bib', line: 'In the champions room, face down. The number has worn off. The pin holes have not.', x: -16.6, z: -16.4, y: .02, yaw: .15 },
];

const KEY = 'speedmax.finds.v1';

export function readFinds() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw.filter(id => FINDS.some(f => f.id === id)) : [];
  } catch (_) { return []; }
}

export function writeFinds(ids) {
  try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch (_) { }
}

export async function buildFinds(ctx) {
  const { scene, loader, pickables } = ctx;
  const gltf = await loader.loadAsync('assets/kona-years/finds.glb');
  const byName = {};
  gltf.scene.traverse(o => { if (o.name && (o.isMesh || o.isGroup)) byName[o.name] = o; });
  const kept = new Set(readFinds());
  const group = new THREE.Group(); group.name = 'finds'; scene.add(group);
  const proxyGeo = new THREE.SphereGeometry(.42, 8, 6);
  const proxyMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const spots = FINDS.map(def => {
    const src = byName[def.mesh] || byName[def.id];
    const holder = new THREE.Group();
    holder.position.set(def.x, def.y, def.z);
    holder.rotation.y = def.yaw;
    if (src) {
      const mesh = src.clone(true);
      mesh.traverse(o => { if (o.isMesh) o.material = o.material.clone(); });
      const box = new THREE.Box3().setFromObject(mesh);
      const c = box.getCenter(new THREE.Vector3());
      mesh.position.sub(c);
      mesh.position.y += (box.max.y - box.min.y) / 2;
      holder.add(mesh);
    }
    const spot = { ...def, holder, found: kept.has(def.id) };
    const proxy = new THREE.Mesh(proxyGeo, proxyMat);
    proxy.position.y = .2;
    proxy.userData.find = spot;
    holder.add(proxy);
    pickables.push(proxy);
    holder.visible = !spot.found;
    group.add(holder);
    return spot;
  });
  return {
    spots,
    kept,
    take(spot) {
      if (spot.found) return false;
      spot.found = true;
      spot.holder.visible = false;
      kept.add(spot.id);
      writeFinds([...kept]);
      try { applyStoredEvent({ type: 'FIND_DISCOVERED', subject: `find:shore:${spot.id}` }); } catch (_) { /* the object is still kept */ }
      return true;
    },
  };
}
