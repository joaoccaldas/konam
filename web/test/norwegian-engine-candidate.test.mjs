import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=path.resolve(import.meta.dirname,'../..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const json=p=>JSON.parse(read(p));

test('NOR3 has one canonical installation geometry authority',()=>{
  const decorations=json('museum/world/decorations.json');
  const matches=decorations.installations.filter(x=>x.id==='norwegian-engine');
  assert.equal(matches.length,1);
  assert.equal(matches[0].builder,'norwegian');
  assert.equal(matches[0].source,'web/src/engine/room-installations.js');

  const src=read('web/src/engine/room-installations.js');
  assert.match(src,/function norwegian\(ctx\)/);
  assert.match(src,/INSTALLATION_BUILDERS=Object\.freeze\(\{bio,horror,alien,zombie,norwegian\}\)/);
  assert.doesNotMatch(src,/new\s+THREE\.WebGLRenderer|new\s+THREE\.PerspectiveCamera|OrbitControls|RoomEnvironment/);

  const review=read('web/src/room-review-norwegian.js');
  assert.match(review,/buildInstallation\('norwegian'/);
  assert.equal(fs.existsSync(path.join(ROOT,'web/src/review/norwegian-installation.snapshot.js')),false);
});

test('NOR3 has one review surface and remains absent from public room navigation',()=>{
  assert.ok(fs.existsSync(path.join(ROOT,'norwegian-engine-review.html')));
  assert.equal(fs.existsSync(path.join(ROOT,'review/norwegian-engine/index.html')),false);

  const rooms=json('museum/world/rooms.json');
  assert.equal((rooms.areas||[]).some(x=>JSON.stringify(x).includes('norwegian-engine')),false);
  const landing=read('web/src/landing.js');
  assert.doesNotMatch(landing,/data-room=["']norwegian-engine|buildInstallation\(['"]norwegian/);
});

test('NOR3 candidate package is local, mapped and unwired',()=>{
  const room=json('world/konam/rooms/norwegian-engine.room.json');
  assert.equal(room.classification.status,'candidate');
  assert.equal(room.classification.public,false);
  assert.equal(room.parent_room,'room-026');
  assert.equal(room.implementation.source,'web/src/engine/room-installations.js');
  assert.equal('source_branch' in room.implementation,false);
  assert.equal(room.release.public_wiring,false);
  assert.ok(room.spatial.zones.includes('recovery'));

  const assets=json(room.assets.manifest);
  const layout=json(room.assets.placements);
  assert.equal(assets.runtime_mapping.review_variant,'cinematic-production-v3');
  assert.equal(assets.athletes.length,3);
  assert.deepEqual(assets.lanes.map(x=>x.id),['lane-01','lane-02','lane-03']);
  assert.equal(layout.release_rules.register_in_rooms_json,false);
  assert.equal(layout.release_rules.add_to_public_navigation,false);
  assert.equal(layout.release_rules.athlete_bike_assignment_requires_verified_source,true);
});

test('NOR3 bike slots reuse canonical product pipeline and make no athlete equipment claims',()=>{
  const room=json('world/konam/rooms/norwegian-engine.room.json');
  assert.equal(room.assets.bike_pipeline,'museum/bike.schema.json');
  for(const subject of room.subjects)assert.deepEqual(subject.equipment_claims,[]);

  const assets=json(room.assets.manifest);
  for(const lane of assets.lanes){
    assert.equal(lane.bike.mode,'canonical-host-slot');
    assert.equal(lane.bike.asset_id,null);
    assert.equal(lane.bike.claim_status,'unverified-do-not-assign');
  }
});

test('NOR3 reusable asset generation remains candidate-only and reuse-audited',()=>{
  const room=json('world/konam/rooms/norwegian-engine.room.json');
  assert.ok(fs.existsSync(path.join(ROOT,room.provenance.reuse_audit)));
  const assets=json(room.assets.manifest);
  assert.ok(assets.assets.some(x=>x.id==='nor3-trainer'));
  assert.ok(assets.assets.some(x=>x.id==='nor3-recovery-bench'&&x.format==='procedural'));
  assert.ok(fs.existsSync(path.join(ROOT,'blender/norwegian_engine_assets.py')));
  assert.equal(fs.existsSync(path.join(ROOT,'assets/rooms/norwegian-engine/direct-drive-trainer.glb')),false);
});


test('every NOR3 candidate asset is assigned to at least one runtime zone',()=>{
  const assets=json('world/konam/candidates/norwegian-engine-assets-v1.json');
  const mapped=new Set(Object.values(assets.runtime_mapping.zones).flat());
  const unmapped=assets.assets.map(x=>x.id).filter(id=>!mapped.has(id));
  assert.deepEqual(unmapped,[]);
});

test('NOR3 spatial layout covers every canonical room zone',()=>{
  const room=json('world/konam/rooms/norwegian-engine.room.json');
  const layout=json('world/konam/candidates/norwegian-engine-room-layout-v1.json');
  const layoutZones=new Set(layout.zones.map(x=>x.id));
  const missing=room.spatial.zones.filter(id=>id!=='room-shell'&&!layoutZones.has(id));
  assert.deepEqual(missing,[]);
});
