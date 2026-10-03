import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('canonical storage announces personal-state mutations',()=>{
  const src=read('src/engine/storage.js');
  assert.match(src,/STATE_CHANGE_EVENT = 'kona:statechange'/);
  assert.match(src,/announceStateChange\(name,value==null\?'remove':'write'\)/);
  assert.match(src,/if\(changed\)announceStateChange\(name,'remove'\)/);
});

test('museum Finds use canonical storage instead of direct legacy localStorage',()=>{
  const src=read('src/finds.js');
  assert.match(src,/readStorage\('finds'\)/);
  assert.match(src,/writeStorage\('finds'/);
  assert.doesNotMatch(src,/localStorage\.setItem\(['"]speedmax\.finds/);
});

test('User Studio keeps race and collection summaries live',()=>{
  const src=read('src/ui/avatar-home.js');
  assert.match(src,/data-menu-note="races"/);
  assert.match(src,/data-menu-note="collection"/);
  assert.match(src,/freshSummary\.total\+' collected items · '\+freshSummary\.finds\+' Finds'/);
  assert.match(src,/addEventListener\?\.\(STATE_CHANGE_EVENT,onStateChange\)/);
  assert.match(src,/renderRacePicker\(host,\{onChange:\(\)=>syncPersonalSummary\(\)\}\)/);
  assert.match(src,/removeEventListener\?\.\(STATE_CHANGE_EVENT,onStateChange\)/);
});

test('Collection reveals thumbnails only after a Find is collected',()=>{
  const src=read('src/ui/collection.js');
  assert.match(src,/item\.collected\?'<img class="find-thumb"/);
  assert.match(src,/:\'<i class="find-mark" aria-hidden="true">◇<\/i>\'/);
  assert.match(src,/addEventListener\?\.\(STATE_CHANGE_EVENT,onStateChange\)/);
  assert.match(src,/removeEventListener\?\.\(STATE_CHANGE_EVENT,onStateChange\)/);
});

test('BFCache return refreshes the active personal projection',()=>{
  const src=read('src/ui/kona-shell.js');
  assert.match(src,/addEventListener\('pageshow',event=>\{/);
  assert.match(src,/if\(!event\.persisted\)return/);
  assert.match(src,/if\(currentView==='me'\)raceSelf\(\)/);
  assert.match(src,/else if\(currentView==='collection'\)collection\(\)/);
  assert.match(src,/else if\(currentView==='garage'\)garage\(\)/);
});
