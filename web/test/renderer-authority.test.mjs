import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const json=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));

test('renderer authority inventory is unique, explicit and migration-bound',()=>{
  const inventory=json('config/renderer-authority-v1.json');
  assert.equal(inventory.schema_version,1);
  assert.equal(inventory.first_pilot,'web/src/ui/collectible-stage.js');
  assert.equal(inventory.counts.repo_source_constructors,14);
  assert.equal(inventory.counts.browser_or_viewer_constructors,12);
  assert.equal(inventory.counts.offline_tool_constructors,2);
  const paths=inventory.renderers.map(x=>x.path);
  assert.equal(new Set(paths).size,paths.length,'renderer paths must be unique');
  for(const entry of inventory.renderers){
    assert.ok(entry.path&&entry.class&&entry.migrate&&entry.reason,JSON.stringify(entry));
    if(entry.public_runtime){
      assert.ok(['kernel-required','kernel-pilot','kernel-candidate'].includes(entry.migrate),entry.path);
    }
  }
});

test('Collectible Stage is the bounded first kernel pilot',()=>{
  const inventory=json('config/renderer-authority-v1.json');
  const pilot=inventory.renderers.find(x=>x.path===inventory.first_pilot);
  assert.ok(pilot);
  assert.equal(pilot.migrate,'kernel-pilot');
  assert.equal(pilot.risk,'low');
  assert.equal(pilot.current.explicit_dispose,true);
});

test('architecture hygiene consumes the renderer inventory instead of a second hardcoded allowlist',()=>{
  const hygiene=fs.readFileSync(path.join(ROOT,'tools/authority-hygiene.mjs'),'utf8');
  assert.match(hygiene,/config\/renderer-authority-v1\.json/);
  assert.match(hygiene,/actualRendererPaths/);
  assert.match(hygiene,/renderer inventory entry has no WebGLRenderer constructor/);
});
