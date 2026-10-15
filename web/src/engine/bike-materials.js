// engine/bike-materials.js — one material upgrade for every bike, wherever it is shown (world, rooms).
// Physically-based details the source GLBs lack, at a measured cost: a clearcoat on bare carbon (the visible win;
// skipped in lite mode), and a matte, rubbery roughness on tyres, saddles and bar tape on the standard material.
// Sheen was tried and dropped: +12-25 % frame time in the hall for a barely visible effect (docs/evidence/
// app-3d-css-audit-20261004). Works by material NAME (the canonical GLBs and the Blender generator share the
// vocabulary), never touches nodes, names or machine-inspection extras, and is idempotent.
import * as THREE from 'three';

const physical = m => {
  if (m.isMeshPhysicalMaterial) return m;
  const p = new THREE.MeshPhysicalMaterial(); THREE.MeshStandardMaterial.prototype.copy.call(p, m); p.name = m.name; p.userData = { ...m.userData }; return p;
};

export function upgradeBikeMaterial(m, { lite = false } = {}) {
  if (!m || m.userData?.bikeUpgraded || !(m.isMeshStandardMaterial)) return m;
  const n = m.name || '';
  let out = m;
  if (/tyre|tire|rubber/.test(n)) { out.roughness = Math.max(out.roughness, .82); out.metalness = 0; }
  else if (/carbon/.test(n) && !m.clearcoat && !lite) { out = physical(m); out.clearcoat = .85; out.clearcoatRoughness = .12; }
  else if (/saddle|tape|pad_foam/.test(n)) { out.roughness = Math.max(out.roughness, .7); }
  out.userData.bikeUpgraded = true;
  return out;
}

export function upgradeBikeMaterials(root, opts) {
  const seen = new Map(), up = m => { if (!seen.has(m)) seen.set(m, upgradeBikeMaterial(m, opts)); return seen.get(m); };   // shared stays shared
  root.traverse(o => {
    if (!o.isMesh) return;
    o.material = Array.isArray(o.material) ? o.material.map(up) : up(o.material);
  });
  return root;
}
