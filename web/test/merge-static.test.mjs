import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { mergeStatic } from '../src/engine/decor.js';

const room = (...mats) => { const g = new THREE.Group(); mats.forEach((m, i) => { const b = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), m); b.position.x = i * 2; g.add(b); }); return g; };
const count = g => { let n = 0; g.traverse(o => { if (o.isMesh) n++; }); return n; };
const std = color => new THREE.MeshStandardMaterial({ color, roughness: .5 });

test('default merge is by material identity: twin materials stay separate (rooms may mutate them later)', () => {
  const g = room(std('#202020'), std('#202020')); mergeStatic(g); assert.equal(count(g), 2);
});

test('byValue merges untextured twins; a number also folds near-identical colours, but never textured materials', () => {
  const g = room(std('#202020'), std('#202020'), std('#ff6a00')); mergeStatic(g, { byValue: true }); assert.equal(count(g), 2);
  const n = room(std('#0a0a0b'), std('#0f1012')); mergeStatic(n, { byValue: true }); assert.equal(count(n), 2, 'exact by default');
  const q = room(std('#0a0a0b'), std('#0f1012')); mergeStatic(q, { byValue: 10 }); assert.equal(count(q), 1, 'folded on phones');
  const tex = new THREE.Texture(), t = room(new THREE.MeshStandardMaterial({ map: tex }), new THREE.MeshStandardMaterial({ map: tex })); mergeStatic(t, { byValue: 10 }); assert.equal(count(t), 2);
});

test('decals: transparent meshes merge only when they share a material and never write depth', () => {
  const decal = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }), glassy = new THREE.MeshBasicMaterial({ transparent: true });
  const d = room(decal, decal); mergeStatic(d, { decals: true }); assert.equal(count(d), 1);
  const k = room(decal, decal); mergeStatic(k); assert.equal(count(k), 2, 'off unless asked');
  const s = room(glassy, glassy); mergeStatic(s, { decals: true }); assert.equal(count(s), 2, 'depth-writing transparency keeps its sort order');
});
