import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateBrandRoom } from '../src/engine/brandroom.js';
import { PIER } from '../src/pier.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'museum/world/brand_rooms.json'), 'utf8'));
const reserved = [
  { id: 'pier', bounds: { x0: PIER.x0, x1: PIER.x1, z0: PIER.z0, z1: PIER.z1 } },
  { id: 'hall', bounds: { x0: -7, x1: 7, z0: 5, z1: -46.5 } },
];

test('production brand rooms stay off the hall and the pier', () => {
  for (const room of data.rooms) {
    const siblings = [...reserved, ...data.rooms.filter(r => r.id !== room.id)];
    const errs = validateBrandRoom(room, siblings);
    assert.deepEqual(errs, [], `${room.id}: ${errs.join('; ')}`);
  }
});

test('overlapping rooms are rejected on both axes', () => {
  const a = { id: 'a', name: 'A', bounds: { x0: 0, x1: 4, z0: 0, z1: -6 }, theme: {}, products: [] };
  const b = { id: 'b', bounds: { x0: 3, x1: 8, z0: -2, z1: -9 } };
  assert.ok(validateBrandRoom(a, [b]).some(e => /overlap/.test(e)));
});

test('a shared wall is not an overlap', () => {
  const a = { id: 'a', name: 'A', bounds: { x0: 9.6, x1: 20, z0: -46.6, z1: -60 }, theme: {}, products: [] };
  const pier = { id: 'pier', bounds: { x0: PIER.x0, x1: PIER.x1, z0: PIER.z0, z1: PIER.z1 } };
  assert.deepEqual(validateBrandRoom(a, [pier]).filter(e => /overlap/.test(e)), []);
});
