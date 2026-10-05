// engine/decor.js — data-driven room dressing for the host world.
//
// A room lists its movable dressing in world/konam/rooms/<room>.decor.json (see tools/decor.mjs to list, find,
// add, move, remove and validate items). This module turns those items into geometry the cheap way:
//   • every item with several placements becomes InstancedMeshes (one draw per material for all copies);
//   • a GLB's meshes are merged per material before instancing, so a 70-part bike costs ~10 draws, not 70;
//   • bikes come from the parametric atlas (assets/atlas/<key>/bike.glb, bike-lite.glb on phones) and are
//     aligned by their hubs: forward = +z, ground at y = 0, centred, so placements are just x, y, z, yaw.
// The room supplies materials (materialFor) so its look stays its own; this module owns no style.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);

// quantized/interleaved attributes → plain floats (needed before baking transforms into geometry)
export function toFloat(g, keep = ['position', 'normal']) {
  for (const n of Object.keys(g.attributes)) {
    const a = g.attributes[n];
    if (!keep.includes(n)) { g.deleteAttribute(n); continue; }
    if (a.array instanceof Float32Array && !a.isInterleavedBufferAttribute) continue;
    const f = new Float32Array(a.count * a.itemSize);
    for (let i = 0; i < a.count; i++) for (let c = 0; c < a.itemSize; c++) f[i * a.itemSize + c] = a.getComponent(i, c);
    g.setAttribute(n, new THREE.BufferAttribute(f, a.itemSize));
  }
  return g.index ? g.toNonIndexed() : g;
}

// Bake a loaded scene into per-material geometry in a normalised frame.
// align: 'bike' (hubs → forward +z), 'height' (scale to `height`), or null. Returns { byMat, info }.
export function bake(root, { align = null, height = null, keep } = {}) {
  root.updateMatrixWorld(true);
  const parts = []; root.traverse(o => { if (o.isMesh) parts.push(o); });
  const geos = parts.map(o => { const g = toFloat(o.geometry.clone(), keep);
    if (keep?.includes('uv') && !g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));   // mergeable
    return g.applyMatrix4(o.matrixWorld); });
  const box = () => { const b = new THREE.Box3(); geos.forEach(g => { g.computeBoundingBox(); b.union(g.boundingBox); }); return b; };
  const centreOf = key => { const i = parts.findIndex(o => o.name.includes(key)); return i < 0 ? null : (geos[i].computeBoundingBox(), geos[i].boundingBox.getCenter(new THREE.Vector3())); };
  let rear = null, front = null;
  if (align === 'bike') {
    const b0 = box(), c0 = b0.getCenter(new THREE.Vector3());
    rear = centreOf('wheel_rear_hub') || new THREE.Vector3(b0.min.x + .35, .35, c0.z);
    front = centreOf('wheel_front_hub') || new THREE.Vector3(b0.max.x - .35, .35, c0.z);
    const rot = new THREE.Matrix4().makeRotationY(-Math.atan2(front.x - rear.x, front.z - rear.z));
    geos.forEach(g => g.applyMatrix4(rot)); rear.applyMatrix4(rot); front.applyMatrix4(rot);
  }
  if (height) { const b = box(), s = height / Math.max(1e-6, b.max.y - b.min.y); const sc = new THREE.Matrix4().makeScale(s, s, s); geos.forEach(g => g.applyMatrix4(sc)); rear?.applyMatrix4(sc); front?.applyMatrix4(sc); }
  const b = box(), c = b.getCenter(new THREE.Vector3()), shift = new THREE.Matrix4().makeTranslation(-c.x, -b.min.y, -c.z);
  geos.forEach(g => g.applyMatrix4(shift)); rear?.applyMatrix4(shift); front?.applyMatrix4(shift);
  const byMat = new Map();
  parts.forEach((o, k) => { const m = o.material, key = m?.name || m?.uuid || 'm'; if (!byMat.has(key)) byMat.set(key, { source: m, list: [] }); byMat.get(key).list.push(geos[k]); });
  const size = box().getSize(new THREE.Vector3());
  return { byMat, info: { size, rear, front, length: size.z, parts: parts.length } };
}

// placements: [[x, y, z, yawDeg, scale?], ...]. materialFor(sourceMaterial, name) → material (or null to skip that material).
export function instance(baked, placements, { group, materialFor = m => m, castShadow = true, receiveShadow = true, colors = null } = {}) {
  const meshes = [];
  for (const [name, { source, list }] of baked.byMat) {
    const mat = materialFor(source, name); if (!mat) continue;
    const im = new THREE.InstancedMesh(mergeGeometries(list), mat, placements.length);
    placements.forEach(([x, y, z, yaw = 0, s = 1], i) => {
      M4.compose(V.set(x, y, z), Q.setFromAxisAngle(Y, yaw * Math.PI / 180), S.set(s, s, s)); im.setMatrixAt(i, M4);
      if (colors) im.setColorAt(i, colors(i, name));
    });
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = castShadow; im.receiveShadow = receiveShadow; im.computeBoundingSphere(); group.add(im); meshes.push(im);
  }
  return meshes;
}

export const bikeUrl = (key, lite) => `assets/atlas/${key}/${lite ? 'bike-lite' : 'bike'}.glb`;

// Load every item of a decor manifest. Rooms pass hooks for anything room-specific.
//   hooks.materialFor(item, sourceMaterial, name) → material | null
//   hooks.colors(item) → (instanceIndex, materialName) => THREE.Color   (optional, e.g. liveries)
//   hooks.placed(item, { meshes, info })                                 (optional, e.g. trainers under bikes)
export async function loadDecor(manifest, { group, loader, lite = false, hooks = {} }) {
  const out = {};
  for (const item of manifest.items || []) {
    if (lite && item.lite === 'skip') continue;
    try {
      const url = item.kind === 'bike' ? bikeUrl(item.ref, lite) : (lite && item.lite_ref) || item.ref;
      const root = (await loader.loadAsync(url)).scene;
      const baked = bake(root, { align: item.kind === 'bike' ? 'bike' : null, height: item.height || null, keep: item.kind === 'bike' ? ['position', 'normal'] : ['position', 'normal', 'uv'] });
      const meshes = instance(baked, item.at, { group, castShadow: item.cast_shadow !== false && !lite,
        materialFor: (m, name) => hooks.materialFor ? hooks.materialFor(item, m, name) : m, colors: hooks.colors?.(item) || null });
      out[item.id] = { meshes, info: baked.info };
      hooks.placed?.(item, out[item.id]);
    } catch (e) { console.warn('decor', item.id, e?.message || e); }
  }
  return out;
}

// Merge a built room's static meshes per material, in place: one draw per material instead of one per prop.
// `keep(o)` returns true for anything that moves, is picked, swaps state or is positioned later — those (and their
// subtrees) stay untouched, as do instanced, skinned, multi-material and transparent meshes (sorting stays per
// object). Returns { before, after } mesh counts. Call once, at the end of a room's build.
export function mergeStatic(group, { keep = () => false } = {}) {
  group.updateMatrixWorld(true);
  const count = () => { let n = 0; group.traverse(o => { if (o.isMesh) n++; }); return n; }, before = count();
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert(), buckets = new Map(), owner = new Map();
  const walk = o => {
    for (const c of [...o.children]) {
      if (keep(c)) continue;
      const attrs = c.isMesh ? Object.keys(c.geometry.attributes).filter(n => ['position', 'normal', 'uv'].includes(n)).sort() : [];
      if (c.isMesh && !c.isInstancedMesh && !c.isSkinnedMesh && !Array.isArray(c.material) && !c.material.transparent && c.visible && !c.children.length && attrs.includes('normal')) {
        const key = [c.material.uuid, c.castShadow, c.receiveShadow, c.renderOrder, attrs.join()].join('|');
        if (!buckets.has(key)) buckets.set(key, { mat: c.material, cast: c.castShadow, recv: c.receiveShadow, order: c.renderOrder, list: [], meshes: [] });
        const b = buckets.get(key); b.list.push(toFloat(c.geometry.clone(), attrs).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, c.matrixWorld))); b.meshes.push(c);
      } else walk(c);
    }
  };
  walk(group);
  for (const b of buckets.values()) {
    if (b.meshes.length < 2) continue;                                     // nothing to gain
    const m = new THREE.Mesh(mergeGeometries(b.list), b.mat); m.castShadow = b.cast; m.receiveShadow = b.recv; m.renderOrder = b.order; m.name = 'merged-static';
    group.add(m); for (const c of b.meshes) c.parent.remove(c);
  }
  return { before, after: count() };
}
