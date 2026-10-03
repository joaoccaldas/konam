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
  assert.match(room,/original KONA\.m route study[\s\S]*not a copied Zwift screen/);
});

test('Beast Cave and Breitling split the footprint instead of overlapping',async()=>{
  const brand=JSON.parse(fs.readFileSync(new URL('../../museum/world/brand_rooms.json',import.meta.url),'utf8'));
  const { BROOM, BLINK, beastCaveWalkable }=await import('../src/beast-cave.js');
  const b=brand.rooms.find(r=>r.id===BLINK.toRoom).bounds;
  const overlap=BROOM.x0<b.x1&&BROOM.x1>b.x0&&BROOM.z1<b.z0&&BROOM.z0>b.z1;
  assert.equal(overlap,false);
  assert.ok(BLINK.x0>b.x0&&BLINK.x1<b.x1,'the link door opens into the Breitling room');
  const WALK={x0:-6.4,x1:6.4};
  for(let z=BROOM.z1+.5;z>b.z0-.6;z-=.1) assert.ok(beastCaveWalkable((BLINK.x0+BLINK.x1)/2,z,WALK)||z<b.z0-.5,`gap in the link at z=${z.toFixed(2)}`);
});

test('Beast Cave facts are sourced and the Zwift card stays unofficial',()=>{
  const facts=JSON.parse(fs.readFileSync(new URL('../../pitch/lionel-sanders/career-facts-v1.json',import.meta.url),'utf8'));
  for(const f of [...facts.facts,facts.gap,facts.title]) assert.ok(f.sources?.length&&f.sources.every(u=>/^https:\/\//.test(u)),f.id);
  assert.equal(facts.gap.value,'2:27');
  assert.match(room,/zwiftRoom\.disclaimer/);
  assert.doesNotMatch(room,/affiliate[^']*href|impact\.com/i);
});
