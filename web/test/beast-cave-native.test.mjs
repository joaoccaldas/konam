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
  assert.match(room,/original KONA\.m route study[\s\S]*No third-party training-app screens or route art are reproduced/);
});

test('Beast Cave keeps its own footprint, no door and no third-party brand inside',async()=>{
  const brand=JSON.parse(fs.readFileSync(new URL('../../museum/world/brand_rooms.json',import.meta.url),'utf8'));
  const { BROOM, beastCaveWalkable }=await import('../src/beast-cave.js');
  for(const r of brand.rooms){const b=r.bounds;assert.equal(BROOM.x0<b.x1&&BROOM.x1>b.x0&&BROOM.z1<b.z0&&BROOM.z0>b.z1,false,r.id);}
  const WALK={x0:-6.4,x1:6.4};
  for(let x=BROOM.x0+1;x<BROOM.x1-1;x+=.5) assert.equal(beastCaveWalkable(x,BROOM.z1-.3,WALK),false,`walkable through the south wall at x=${x}`);
  assert.doesNotMatch(room,/breitling|zwift-room|BUILD THIS CAVE|current_eu_price/i);
  assert.doesNotMatch(landing,/BLINK/);
});

test('the interval is shareable, keeps a personal best through storage.js and invents no athlete line',()=>{
  assert.match(room,/function resultImage/);
  assert.match(landing,/readStorage\('athleteRoomBests'\)/);
  assert.match(landing,/writeStorage\('athleteRoomBests'/);
  assert.match(landing,/This slot stays empty until Lionel Sanders chooses to ride the interval/);
});

test('Beast Cave facts are sourced and the Zwift card stays unofficial',()=>{
  const facts=JSON.parse(fs.readFileSync(new URL('../../pitch/lionel-sanders/career-facts-v1.json',import.meta.url),'utf8'));
  for(const f of [...facts.facts,facts.gap,facts.title]) assert.ok(f.sources?.length&&f.sources.every(u=>/^https:\/\//.test(u)),f.id);
  assert.equal(facts.gap.value,'2:27');
  assert.doesNotMatch(room,/affiliate[^']*href|impact\.com/i);
});
