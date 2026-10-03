// Latest-main release certification trigger.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('../../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
const collection=read('web/src/ui/collection.js');
const css=read('web/styles/finds.css');
const shell=read('web/src/ui/kona-shell.js');
const build=read('tools/build_app.mjs');
const stage=read('tools/stage_site.sh');

test('live Collection uses a mystery vault while preserving the 100-slot truth',()=>{
  assert.match(collection,/finds-vault/);
  assert.match(collection,/LIVE SLOTS/);
  assert.match(collection,/FOUNDING COLLECTION/);
  assert.match(collection,/canonical · expanding/);
  assert.match(collection,/same canonical equipment record|larger world-scale collection/);
  assert.match(collection,/summary\.total/);
  assert.doesNotMatch(collection,/141 \/ 141 collected/);
});

test('Founding 141 is contextual, not falsely presented as fully live',()=>{
  assert.match(collection,/Founding 141 is the larger world-scale collection still being wired behind this live 100-slot surface/);
  assert.match(collection,/LIVE FIND COLLECTION/);
});

test('vault keeps existing interaction and accessibility hooks',()=>{
  assert.match(collection,/data-find="/);
  assert.match(collection,/aria-label="Find /);
  assert.match(collection,/data-find-filter/);
  assert.match(collection,/find-card/);
  assert.match(collection,/data-find-return/);
  assert.match(collection,/data-view-find/);
});

test('vault styling is brand-token driven and responsive',()=>{
  for(const token of ['--brand-lava','--brand-mist','--brand-lime','--brand-ocean','--brand-action']) assert.match(css,new RegExp('var\\('+token+'\\)'));
  assert.match(css,/grid-template-columns:repeat\(10/);
  assert.match(css,/grid-template-columns:repeat\(5/);
  assert.match(css,/prefers-reduced-motion/);
});

test('Collection loads its visual layer lazily and ships it in web/native release',()=>{
  assert.match(shell,/featureStyle\('finds','web\/styles\/finds\.css'\)/);
  assert.match(build,/web\/styles\/finds\.css/);
  assert.match(stage,/web\/styles\/finds\.css/);
});
