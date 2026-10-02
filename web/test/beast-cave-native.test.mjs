import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const landing=fs.readFileSync(new URL('../src/landing.js',import.meta.url),'utf8');
const room=fs.readFileSync(new URL('../src/beast-cave.js',import.meta.url),'utf8');
const registry=JSON.parse(fs.readFileSync(new URL('../../museum/world/rooms.json',import.meta.url),'utf8'));

test('Beast Cave uses the native museum room architecture',()=>{
  assert.match(landing,/from '.\/beast-cave\.js'/);
  assert.match(landing,/buildBeastCave\(/);
  assert.match(landing,/beastCaveWalkable\(x, z, WALK\)/);
  assert.match(landing,/data-room="beast"/);
  assert.match(landing,/loadBeastBike/);
  assert.match(landing,/beast\.update\(t, reduce\)/);
  assert.doesNotMatch(landing,/experiences\/beast-cave|beast-cave-experience/);
});

test('Beast Cave exports one native room, doorway, walkable and builder',()=>{
  assert.match(room,/export const BROOM/);
  assert.match(room,/export const BDOOR/);
  assert.match(room,/export function beastCaveWalkable/);
  assert.match(room,/export function buildBeastCave/);
  assert.match(room,/group\.name = 'beastCaveRoom'/);
  assert.match(room,/pickables\.push/);
  assert.match(room,/obstacles\.push/);
  assert.match(room,/setBike\(bike,dress\)/);
  assert.match(room,/update\(t,reduce\)/);
});

test('Beast Cave is registered once in the canonical room registry',()=>{
  const matches=registry.areas.filter(a=>a.id==='beast');
  assert.equal(matches.length,1);
  assert.equal(matches[0].floor,'ground');
  assert.equal(matches[0].kind,'themed');
});
