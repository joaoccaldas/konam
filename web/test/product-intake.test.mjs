import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canEquip } from '../src/studio/race-setup.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const J=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const D=J('museum/test/product-intake-v0.json');
const byId=Object.fromEntries(D.products.map(p=>[p.id,p]));

test('product intake proof preserves identity, provenance and candidate readiness',()=>{
  assert.equal(D.schema_version,1);
  assert.equal(D.rooms.length,2);
  for(const p of D.products){
    assert.ok(p.id&&p.brand&&p.model&&p.type&&p.representation&&p.asset_path,p.id);
    assert.ok(p.source_records?.length,p.id);
    assert.ok(p.capabilities.includes('inspect')&&p.capabilities.includes('equip')&&p.capabilities.includes('share'),p.id);
    assert.equal(p.readiness,'candidate',p.id);
    assert.ok(fs.existsSync(path.join(root,p.asset_path)),p.asset_path);
    assert.ok(p.metrics.glb_bytes>0&&p.metrics.triangles_approx>0,p.id);
  }
});

test('test rooms are data-only product assignments',()=>{
  const ids=new Set(D.products.map(p=>p.id));
  for(const r of D.rooms){
    assert.ok(r.id&&r.title&&r.design&&r.story,r.id);
    assert.ok(r.products.length,r.id);
    for(const id of r.products)assert.ok(ids.has(id),`${r.id}: ${id}`);
  }
});

test('Cervelo candidate equips bike slot and rejects shoe slot',()=>{
  const p=byId['cervelo-p5-disc-mk2-size54'];
  assert.equal(canEquip(p,'bike'),true);
  assert.equal(canEquip(p,'shoe'),false);
});

test('Alphafly candidate equips shoe slot and rejects bike slot',()=>{
  const p=byId['nike-alphafly-3-study'];
  assert.equal(canEquip(p,'shoe'),true);
  assert.equal(canEquip(p,'bike'),false);
});

test('test-room runtime has no brand-specific branches',()=>{
  const src=fs.readFileSync(path.join(root,'web/src/product-intake-proof.js'),'utf8');
  assert.doesNotMatch(src,/Cervelo|Cervélo|Nike|Alphafly|P5 Disc/i);
  assert.match(src,/productById/);
  assert.match(src,/asset_path/);
});

test('RaceSetup domain file is unchanged from intake base expectation',()=>{
  const src=fs.readFileSync(path.join(root,'web/src/studio/race-setup.js'),'utf8');
  assert.match(src,/export function canEquip/);
  assert.doesNotMatch(src,/Cervelo|Cervélo|Nike|Alphafly/i);
});
