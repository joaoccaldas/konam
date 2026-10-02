import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {roomReviewAreas} from '../src/engine/room-review.js';

const ROOT=path.resolve(import.meta.dirname,'../..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const json=p=>JSON.parse(read(p));

test('NOR3 candidate validates through the global room package validator',()=>{
  const r=spawnSync(process.execPath,['tools/validate-room-package.mjs','norwegian-engine'],{cwd:ROOT,encoding:'utf8'});
  assert.equal(r.status,0,r.stderr||r.stdout);
});

test('NOR3 remains absent from the canonical public room registry',()=>{
  const rooms=json('museum/world/rooms.json');
  assert.equal(rooms.areas.some(a=>JSON.stringify(a).includes('norwegian-engine')),false);
});

test('NOR3 is registered as a candidate installation using the shared host engine',()=>{
  const decorations=json('museum/world/decorations.json');
  const d=decorations.installations.find(x=>x.id==='norwegian-engine');
  assert.ok(d);
  assert.equal(d.builder,'norwegian');
  assert.equal(d.source,'web/src/engine/room-installations.js');
  assert.equal(d.release_state,'candidate-unwired');
});

test('localhost review replaces one slot without changing public source data',()=>{
  const areas=json('museum/world/rooms.json').areas;
  const local=roomReviewAreas(areas,{reviewId:'norwegian-engine',hostname:'127.0.0.1'});
  assert.ok(local.some(a=>a.id==='room-norwegian-engine'));
  assert.equal(local.some(a=>a.id==='room-zombie'),false);
  assert.ok(areas.some(a=>a.id==='room-zombie'),'source array remains unchanged');
  const remote=roomReviewAreas(areas,{reviewId:'norwegian-engine',hostname:'example.com'});
  assert.equal(remote,areas);
});

test('candidate manifest keeps athletes separate from exact equipment claims',()=>{
  const m=json('world/konam/rooms/norwegian-engine.room.json');
  assert.equal(m.classification.status,'candidate');
  assert.equal(m.classification.public,false);
  assert.equal(m.implementation.source_branch,undefined);
  assert.equal(m.subjects.length,3);
  for(const s of m.subjects){
    assert.deepEqual(s.equipment_claims,[]);
    assert.equal(s.brand_association_status,'unverified');
  }
});

test('asset inventory has one semantic identity across proxy and future GLB',()=>{
  const a=json('world/konam/candidates/norwegian-engine-assets-v2.json');
  assert.ok(a.assets.length>=10);
  for(const x of a.assets){
    assert.equal(x.runtime_representation,'procedural-proxy');
    assert.equal(x.production_status,'generator-defined-not-runtime-loaded');
    assert.ok(x.production_output.startsWith('assets/rooms/norwegian-engine/'));
  }
});

test('Norwegian installation exposes multiple specimen slots through the generic host contract',()=>{
  const inst=read('web/src/engine/room-installations.js');
  const landing=read('web/src/landing.js');
  assert.match(inst,/function norwegian\(ctx\)/);
  assert.match(inst,/specimenSlots/);
  assert.match(landing,/room\.specimenSlots\?\.length/);
  assert.doesNotMatch(landing,/norwegian-engine|blummenfelt|gustav|stornes/i);
});

test('the candidate uses global Kona branding and global machine pipeline',()=>{
  const m=json('world/konam/rooms/norwegian-engine.room.json');
  assert.equal(m.brand.tokens,'brand/tokens.css');
  assert.equal(m.brand.typography,'global');
  assert.equal(m.assets.bike_pipeline,'museum/bike.schema.json');
  assert.match(read('web/src/landing.js'),/machine-inspection\.js/);
});
