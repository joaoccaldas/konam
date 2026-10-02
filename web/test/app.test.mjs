// The app layer: profile normalisation, quality presets, the share caption, wing data and layout.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalise, renderSettings, QUALITY, AVATARS, createProfile } from '../src/engine/profile.js';
import { captionLayout } from '../src/engine/share.js';
import { wingWalkable, layoutRoom, sideRect } from '../src/engine/wing.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const json = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));

test('profile: bad values fall back, unknown fields are dropped', () => {
  const p = normalise({ name: '  João  ', avatar: '#000000', quality: 'ultra', favourites: ['a', 'a', 3], evil: '<script>' });
  assert.equal(p.name, 'João'); assert.equal(p.avatar, AVATARS[0]); assert.equal(p.quality, 'auto'); assert.deepEqual(p.favourites, ['a']); assert.equal(p.evil, undefined);
});

test('profile store: set, favourite, export, erase', () => {
  let saved = null; const store = { load: () => saved, save: p => { saved = p; }, clear: () => { saved = null; } };
  const pr = createProfile(store);
  pr.set({ name: 'Ana', quality: 'low' }); pr.toggleFavourite('lotus-108-1992');
  assert.equal(saved.name, 'Ana'); assert.deepEqual(saved.favourites, ['lotus-108-1992']);
  assert.match(pr.export(), /"quality": "low"/);
  pr.erase(); assert.equal(saved, null); assert.equal(pr.get().name, '');
});

test('quality presets: low is lite and shadowless, high is full detail', () => {
  const dev = { lite: true, dpr: 3 };
  assert.deepEqual(renderSettings('low', dev), { lite: true, dpr: 1, flowDpr: .85, shadows: false });
  assert.equal(renderSettings('high', dev).lite, false); assert.equal(renderSettings('high', dev).dpr, 2);
  for (const k of Object.keys(QUALITY)) assert.ok(QUALITY[k].label && QUALITY[k].note);
});

test('share caption scales with the image', () => {
  const a = captionLayout(800, { title: 'Lotus Type 108', place: 'Monocoque' }), b = captionLayout(2400, { title: 'x' });
  assert.ok(b.height > a.height); assert.equal(a.lines[0], 'Lotus Type 108'); assert.match(a.lines[1], /Monocoque · KONA · Kailua-Kona/);
});

test('every wing file is complete and every exhibit it names exists', () => {
  const idx = json('museum/world/wings/index.json'), bikes = json('museum/atlas/bikes.json').bikes;
  const paint = new Set(json('museum/art/paintings.json').paintings.map(p => p.id)), sculpt = new Set(json('museum/art/sculptures.json').sculptures.map(s => s.id));
  const roomIds = new Set();
  for (const f of idx.wings) {
    const w = json(`museum/world/wings/${f}`);
    for (const k of ['id', 'name', 'sub', 'floor', 'y', 'height', 'corridor', 'sides', 'rooms']) assert.ok(w[k] != null, `${f}: ${k}`);
    for (const r of w.rooms) {
      assert.ok(!roomIds.has(r.id), `duplicate room ${r.id}`); roomIds.add(r.id);
      assert.ok(r.z1 > r.z0 && r.z0 >= w.corridor.z0 && r.z1 <= w.corridor.z1, `${r.id} inside its corridor`);
      for (const p of r.paintings || []) assert.ok(paint.has(p), `${r.id}: painting ${p}`);
      for (const s of r.sculptures || []) assert.ok(sculpt.has(s), `${r.id}: sculpture ${s}`);
      assert.ok((r.paintings || []).length <= (bikes.some(b => b.room === r.id) ? 4 : 6), `${r.id}: too many paintings for its walls`);
    }
  }
  for (const b of bikes) if (b.museum !== false) assert.ok(roomIds.has(b.room), `bike ${b.key} names room ${b.room}`);
  assert.ok(bikes.filter(b => b.studio).every(b => b.museum === false && !b.room), 'studio-only designs stay out of the wings');
});

test('wings connect: you can walk from the nave through every door to every room', () => {
  const idx = json('museum/world/wings/index.json'), wings = idx.wings.map(f => json(`museum/world/wings/${f}`));
  const ok = (x, z) => wings.some(w => wingWalkable(w, x, z));
  for (let z = wings[0].corridor.z0 - .6; z < wings.at(-1).corridor.z1 - .5; z += .2) assert.ok(ok(13.6, z), `lane blocked at z=${z.toFixed(1)}`);
  for (const w of wings) for (const r of w.rooms) { const q = sideRect(w, r); assert.ok(ok((q.x0 + q.x1) / 2, (q.z0 + q.z1) / 2), `${r.id} reachable`); }
});

test('room layout keeps exhibits inside their room', () => {
  const w = json('museum/world/wings/kona-light.json');
  for (const r of w.rooms) {
    const L = layoutRoom(w, r, 2, r.paintings || [], (r.sculptures || []).length), q = L.q;
    for (const p of [...L.bikes, ...L.sculptures, ...L.paintings]) assert.ok(p.x >= q.x0 - .01 && p.x <= q.x1 + .01 && p.z >= q.z0 - .01 && p.z <= q.z1 + .01, `${r.id} ${JSON.stringify(p)}`);
  }
});
