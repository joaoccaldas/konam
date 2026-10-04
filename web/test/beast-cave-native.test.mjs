import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const landing=fs.readFileSync(new URL('../src/landing.js',import.meta.url),'utf8');
const room=fs.readFileSync(new URL('../src/beast-cave.js',import.meta.url),'utf8');
const manifest=JSON.parse(fs.readFileSync(new URL('../../world/konam/rooms/beast-cave.room.json',import.meta.url),'utf8'));
const registry=JSON.parse(fs.readFileSync(new URL('../../museum/world/rooms.json',import.meta.url),'utf8'));

test('Beast Cave uses the native Kona.m room architecture without public wiring',()=>{
  assert.match(landing,/from '.\/beast-cave\.js'/);
  assert.match(landing,/buildBeastCave\(/);
  assert.match(landing,/BEAST_CAVE_REVIEW/);
  assert.match(landing,/reviewRoom.*beast-cave/);
  assert.doesNotMatch(landing,/experiences\/beast-cave|beast-cave-experience/);
  assert.equal((registry.areas||[]).some(a=>a.id==='beast'||JSON.stringify(a).includes('beast-cave')),false);
});

test('Beast Cave exports one native room contract',()=>{
  assert.match(room,/export const BROOM/);
  assert.match(room,/export const BDOOR/);
  assert.match(room,/export function beastCaveWalkable/);
  assert.match(room,/export function buildBeastCave/);
  assert.match(room,/group\.name = 'beastCaveRoom'/);
  assert.match(room,/pickables\.push/);
  assert.match(room,/obstacles\.push/);
  assert.doesNotMatch(room,/new\s+THREE\.WebGLRenderer|new\s+THREE\.PerspectiveCamera|new\s+OrbitControls|new\s+RoomEnvironment/);
});

test('Beast Cave candidate is canonical Athlete Rooms child with local implementation',()=>{
  assert.equal(manifest.parent_room,'room-026');
  assert.equal(manifest.classification.type,'athlete-room');
  assert.equal(manifest.classification.status,'candidate');
  assert.equal(manifest.classification.public,false);
  assert.equal(manifest.release.public_wiring,false);
  assert.equal(manifest.implementation.kind,'native-room');
  assert.equal(manifest.implementation.module,'web/src/beast-cave.js');
  assert.equal('source_branch' in manifest.implementation,false);
});

test('Beast Cave procedural material is deterministic and avoids copied UI',()=>{
  assert.match(room,/seededRandom/);
  assert.doesNotMatch(room,/Math\.random/);
  assert.match(room,/original KONA\.m route study[\\s\\S]*No third-party training-app screens or route art are reproduced/);
});
