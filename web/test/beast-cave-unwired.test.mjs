import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=path.resolve(import.meta.dirname,'../..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');

test('Beast Cave stays isolated from production navigation until explicitly approved',()=>{
  const rooms=JSON.parse(read('world/konam/rooms-v1.json'));
  assert.equal(rooms.rooms.length,28,'canonical 28-room registry must not change');
  assert.equal(rooms.rooms.some(r=>/beast-cave|lionel/i.test(r.slug+' '+r.name)),false,'candidate must not be wired into canonical rooms before approval');

  const hall=read('web/src/hall.js');
  const entry=read('web/src/entry.js');
  assert.equal(/beast-cave|buildBeastCave/i.test(hall),false,'hall.js must not wire Beast Cave');
  assert.equal(/beast-cave|buildBeastCave/i.test(entry),false,'entry.js must not wire Beast Cave');
});

test('Beast Cave production-candidate contract is large, explorable and explicitly unwired',()=>{
  const d=JSON.parse(read('world/konam/candidates/athlete-lionel-sanders-beast-cave-v1.json'));
  assert.equal(d.status,'production-candidate-unwired');
  assert.equal(d.public_navigation,false);
  assert.ok(d.dimensions_m.width>=28);
  assert.ok(d.dimensions_m.depth>=22);
  assert.ok(d.zones.length>=7);
  for(const required of ['threshold','trainer','data-wall','heat','gear','recovery','kona-horizon']){
    assert.ok(d.zones.some(z=>z.id===required),`missing zone ${required}`);
  }
  assert.ok(d.acceptance.some(x=>/No import from production navigation/i.test(x)));
});

test('Beast Cave source uses deferred heavy asset hook and exposes disposal',()=>{
  const src=read('web/src/rooms/beast-cave.js');
  assert.match(src,/attachBeastCaveBike/);
  assert.match(src,/disposeBeastCave/);
  assert.match(src,/productionCandidate = true/);
  assert.match(src,/publicNavigation = false/);
  assert.match(src,/buildBeastCaveStoryWing/);
});

test('pitch keeps real-product capture distinct from generated concept art',()=>{
  const p=JSON.parse(read('pitch/lionel-sanders/pitch-story-v1.json'));
  const requirements=p.capture_requirements.join(' ');
  assert.match(requirements,/actual branch implementation/i);
  assert.match(requirements,/generated concept art/i);
  assert.match(requirements,/genuinely explorable 3D space/i);
});
