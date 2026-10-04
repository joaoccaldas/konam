import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('../../',import.meta.url);
const json=path=>JSON.parse(fs.readFileSync(new URL(path,root),'utf8'));
const read=path=>fs.readFileSync(new URL(path,root),'utf8');

test('all 14 canonical founding rooms have one launch runtime bridge',()=>{
  const rooms=json('world/konam/rooms-v1.json').rooms.filter(room=>room.group==='foundation');
  const bridge=json('world/konam/founding-runtime-v1.json');
  assert.equal(rooms.length,14);
  assert.equal(bridge.routes.length,14);
  assert.deepEqual(new Set(bridge.routes.map(route=>route.room_id)),new Set(rooms.map(room=>room.id)));
  for(const room of rooms){
    assert.equal(room.launch_visible,true,room.id+' must be visible at launch');
    assert.equal(room.unlock_rule,'open',room.id+' must not be XP-gated');
    const route=bridge.routes.find(item=>item.room_id===room.id);
    assert.ok(route?.description,room.id+' needs visitor-facing room meaning');
    assert.ok(['world','surface'].includes(route?.action?.kind),room.id+' needs bounded runtime depth');
    assert.ok(route?.action?.target,room.id+' needs a runtime target');
    assert.ok(route?.action?.label,room.id+' needs an explicit action');
  }
});

test('Discover consumes canonical room truth without a second styling authority',()=>{
  const source=read('web/src/ui/discover.js');
  assert.match(source,/world\/konam\/rooms-v1\.json/);
  assert.match(source,/world\/konam\/founding-runtime-v1\.json/);
  assert.match(source,/14\/14 OPEN/);
  assert.match(source,/artifact artifact--label/);
  assert.match(source,/kona-primary/);
  assert.match(source,/btn-text/);
  assert.doesNotMatch(source,/<style|stylesheet|style=/i);
});
