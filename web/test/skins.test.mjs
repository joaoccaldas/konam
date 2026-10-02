// The one livery system: every catalogued skin is valid, every bike file has the paint slots the
// engine needs, and applySkin paints, restores and never leaks between copies.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { SLOTS, slotOfMaterial, skinProblems, slotsOf, ownMaterials, applySkin, skinFromWyld, skinFromFilm } from '../src/engine/skins.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const json = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));

test('slot names are unique across slots', () => {
  const all = Object.values(SLOTS).flat();
  assert.equal(new Set(all).size, all.length);
  assert.equal(slotOfMaterial('rim_carbon'), 'rim'); assert.equal(slotOfMaterial('paint_frame'), 'frame'); assert.equal(slotOfMaterial('nope'), null);
});

test('every catalogued skin is valid and ids are unique', () => {
  const skins = [...json('museum/skins/museum.json').skins, ...json('museum/atlas/bikes.json').bikes.flatMap(b => b.skins.map(s => ({ ...s, id: `${b.key}-${s.id}` })))];
  const wyld = json('museum/wyld_room.json').variants.map(skinFromWyld);
  for (const s of [...skins, ...wyld]) assert.deepEqual(skinProblems(s), [], s.id);
  const ids = skins.map(s => s.id); assert.equal(new Set(ids).size, ids.length);
});

test('film skins carry a five-colour dye', () => {
  const s = skinFromFilm({ id: 'hex', name: 'Witching Hour', darkness: .45, stops: ['#0c0714', '#3a1f6b', '#7b4fd6', '#b6ff5a', '#1a0f2a'], angle: 55, scale: 1.5, flow: 1.3 });
  assert.deepEqual(skinProblems(s), []); assert.equal(s.dye.darkness, .45);
});

function toyBike() {
  const g = new THREE.Group();
  for (const [name, color] of [['paint_frame', '#ffffff'], ['paint_accent', '#222222'], ['rim_carbon', '#111111'], ['decal_dark', '#000000']]) {
    const m = new THREE.MeshPhysicalMaterial({ color }); m.name = name; g.add(new THREE.Mesh(new THREE.BoxGeometry(), m));
  }
  return g;
}
const hex = m => '#' + m.color.getHexString();

test('applySkin paints named slots and restores the rest on the next skin', () => {
  const bike = slotsOf(toyBike());
  applySkin(bike, { id: 'a', name: 'A', frame: '#ff0000', accent: '#00ff00', rim: '#0000ff', glow: { color: '#ff0000', intensity: .5 } });
  assert.equal(hex(bike.slots.frame[0]), '#ff0000'); assert.equal(hex(bike.slots.accent[0]), '#00ff00'); assert.equal(hex(bike.slots.rim[0]), '#0000ff');
  assert.equal(bike.slots.frame[0].emissiveIntensity, .5);
  applySkin(bike, { id: 'b', name: 'B', frame: '#123456' });
  assert.equal(hex(bike.slots.frame[0]), '#123456');
  assert.equal(hex(bike.slots.accent[0]), '#222222');                 // back to the GLB's own colour
  assert.equal(hex(bike.slots.rim[0]), '#111111');
  assert.equal(bike.slots.frame[0].emissiveIntensity, 1);
});

test('ownMaterials keeps copies of one model independent', () => {
  const proto = toyBike();
  const a = ownMaterials(proto.clone(true)), b = ownMaterials(proto.clone(true));
  applySkin(a, { id: 'a', name: 'A', frame: '#ff0000' });
  assert.equal(hex(b.slots.frame[0]), '#ffffff');
});

test('decals can glow (Lava Night) and stop glowing', () => {
  const bike = slotsOf(toyBike());
  applySkin(bike, { id: 'lava', name: 'Lava', frame: '#141116', decals: { color: '#ff7a1a', glow: '#ff4d00', intensity: 1.6 } });
  assert.equal(hex(bike.slots.decalDark[0]), '#ff7a1a'); assert.equal(bike.slots.decalDark[0].emissiveIntensity, 1.6);
  applySkin(bike, { id: 'plain', name: 'Plain', frame: '#141116' });
  assert.equal(hex(bike.slots.decalDark[0]), '#000000'); assert.equal(bike.slots.decalDark[0].emissiveIntensity, 1);
});

test('no page code paints paint_frame directly any more', () => {
  for (const f of ['landing.js', 'engine/wing.js', 'halloween.js']) {
    const src = fs.readFileSync(path.join(root, 'web/src', f), 'utf8');
    assert.doesNotMatch(src, /name === 'paint_frame'\)?\s*\{?\s*m\.color\.set/, f);
    assert.doesNotMatch(src, /applyWyld\(/, f);
  }
});
