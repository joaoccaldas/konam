import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT=path.resolve(import.meta.dirname,'../..');
const j=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));

test('NOR3 and Beast Cave share canonical room envelope',()=>{
  for(const id of ['norwegian-engine','beast-cave']){
    const m=j('world/konam/rooms/'+id+'.room.json');
    for(const k of ['classification','implementation','brand','story','spatial','assets','subjects','interactions','performance','provenance','rights','release']){
      assert.ok(m[k],id+' '+k);
    }
  }
});

test('different adapters share one contract',()=>{
  assert.equal(j('world/konam/rooms/norwegian-engine.room.json').implementation.kind,'installation');
  assert.equal(j('world/konam/rooms/beast-cave.room.json').implementation.kind,'native-room');
});

test('both room packages validate with same validator',()=>{
  for(const id of ['norwegian-engine','beast-cave']){
    const r=spawnSync(process.execPath,['tools/validate-room-package.mjs',id],{cwd:ROOT,encoding:'utf8'});
    assert.equal(r.status,0,r.stderr||r.stdout);
  }
});

test('remote room implementations stay concept-only while local candidates are implemented in-repo',()=>{
  for(const id of ['norwegian-engine','beast-cave']){
    const m=j('world/konam/rooms/'+id+'.room.json');
    if(m.implementation.source_branch){
      assert.equal(m.classification.status,'concept',id+' remote implementation must remain concept');
      continue;
    }
    assert.equal(m.classification.status,'candidate',id+' local implementation should be candidate');
    const implementationPath=m.implementation.kind==='native-room'?m.implementation.module:m.implementation.source;
    assert.ok(fs.existsSync(path.join(ROOT,implementationPath)),id+' local implementation path must exist');
  }
});

test('rooms consume one global Kona.m brand authority',()=>{
  for(const id of ['norwegian-engine','beast-cave']){
    const b=j('world/konam/rooms/'+id+'.room.json').brand;
    assert.equal(b.authority,'docs/BRAND_SYSTEM.md');
    assert.equal(b.tokens,'brand/tokens.css');
    assert.equal(b.ui,'global');
    assert.equal(b.typography,'global');
  }
});

test('bike pipeline is reused, not forked',()=>{
  for(const id of ['norwegian-engine','beast-cave']){
    assert.equal(j('world/konam/rooms/'+id+'.room.json').assets.bike_pipeline,'museum/bike.schema.json');
  }
});


test('athlete rooms are children of the canonical Athlete Rooms district',()=>{
  for(const id of ['norwegian-engine','beast-cave']){
    const m=j('world/konam/rooms/'+id+'.room.json');
    assert.equal(m.parent_room,'room-026');
  }
  const world=j('world/konam/rooms-v1.json');
  const parent=(world.rooms||[]).find(x=>x.id==='room-026');
  assert.equal(parent?.slug,'athlete-rooms');
});
