import test from 'node:test';
import assert from 'node:assert/strict';
import { planRoute, noteProgress } from '../src/engine/route.js';

const to = { x: 16, z: 12 };
const doors = { champ: -17.2, wyld: -29.2 };

test('gallery to gallery stays on the nave lane', () => {
  const pts = planRoute({ x: 14, z: 8, to, fromRoom: 'gallery', toRoom: 'gallery', naveLane: 13.6 });
  assert.deepEqual(pts.map(p => p.x), [13.6, 13.6, 16]);
  assert.equal(pts[0].z, 8);
  assert.equal(pts.at(-1).z, 12);
});

test('same side room is a single step', () => {
  const pts = planRoute({ x: -12, z: -20, to: { x: -14, z: -22 }, fromRoom: 'wyld', toRoom: 'wyld', doors });
  assert.deepEqual(pts, [{ x: -14, z: -22 }]);
});

test('hall to a side room leaves through the doorway', () => {
  const pts = planRoute({ x: 0, z: -10, to: { x: -16, z: -30 }, fromRoom: 'hall', toRoom: 'wyld', doors });
  assert.equal(pts.at(-1).x, -16);
  assert.ok(pts.some(p => p.z === -29.2 && p.x === -9.2));
});

test('a slow slide along a wall eventually drops the waypoint', () => {
  const path = {};
  const g = { x: 1, z: 1 };
  assert.equal(noteProgress(path, g, 5, 0.2), false);
  assert.equal(noteProgress(path, g, 4.99, 0.3), false);
  assert.equal(noteProgress(path, g, 4.98, 0.4), true);
});

test('real progress resets the stuck timer', () => {
  const path = {};
  const g = { x: 1, z: 1 };
  noteProgress(path, g, 5, 0.5);
  assert.equal(noteProgress(path, g, 4, 0.5), false);
  assert.equal(path.stuck, 0);
  assert.equal(path.best, 4);
});
