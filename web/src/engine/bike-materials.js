// engine/bike-materials.js — one material upgrade for every bike, wherever it is shown (world, rooms).
// Physically-based details the source GLBs lack: rubber sheen on tyres, a clearcoat on bare carbon, a soft sheen on
// saddles and bar tape. Works by material NAME (the canonical GLBs and the Blender generator share the vocabulary),
// never touches nodes, names or machine-inspection extras, and is idempotent.
import * as THREE from 'three';

const physical = m => {
  if (m.isMeshPhysicalMaterial) return m;
  const p = new THREE.MeshPhysicalMaterial(); THREE.MeshStandardMaterial.prototype.copy.call(p, m); p.name = m.name; p.userData = { ...m.userData }; return p;
};

export function upgradeBikeMaterial(m) {
  if (!m || m.userData?.bikeUpgraded || !(m.isMeshStandardMaterial)) return m;
  const n = m.name || '';
  let out = m;
  if (/tyre|tire|rubber/.test(n)) { out = physical(m); out.sheen = .35; out.sheenRoughness = .7; out.sheenColor = new THREE.Color('#3a3a3a'); out.roughness = Math.max(out.roughness, .78); }
  else if (/carbon/.test(n) && !m.clearcoat) { out = physical(m); out.clearcoat = .85; out.clearcoatRoughness = .12; }
  else if (/saddle|tape|pad_foam/.test(n)) { out = physical(m); out.sheen = .5; out.sheenRoughness = .8; out.sheenColor = new THREE.Color('#444444'); }
  out.userData.bikeUpgraded = true;
  return out;
}

export function upgradeBikeMaterials(root) {
  const seen = new Map(), up = m => { if (!seen.has(m)) seen.set(m, upgradeBikeMaterial(m)); return seen.get(m); };   // shared stays shared
  root.traverse(o => {
    if (!o.isMesh) return;
    o.material = Array.isArray(o.material) ? o.material.map(up) : up(o.material);
  });
  return root;
}
