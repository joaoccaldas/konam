import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const system=fs.readFileSync(new URL('../styles/system.css',import.meta.url),'utf8');
const shell=fs.readFileSync(new URL('../styles/shell-mobile.css',import.meta.url),'utf8');
const raceSelf=fs.readFileSync(new URL('../styles/race-self.css',import.meta.url),'utf8');
const hall=fs.readFileSync(new URL('../styles/hall-web.css',import.meta.url),'utf8');
const hallMobile=fs.readFileSync(new URL('../styles/hall-mobile.css',import.meta.url),'utf8');
const entry=fs.readFileSync(new URL('../styles/entry.css',import.meta.url),'utf8');

test('Race Self immersive surface has one stylesheet owner',()=>{
  assert.match(raceSelf,/\.race-self-experience/);
  assert.match(raceSelf,/\.race-self-controls/);
  assert.doesNotMatch(shell,/\.race-self-experience|\.race-self-controls|\.hub-drawer|\.avatar-options/);
  assert.doesNotMatch(system,/\.race-self-experience|\.race-self-controls/);
  assert.match(system,/\.kona-user-menu/);
  assert.match(system,/body\.kona-panel-open \.kona-user-menu\{display:none\}/);
  assert.doesNotMatch(raceSelf,/body\.race-self-open[^\n]*\.kona-user-menu\{display:none\}/);
  assert.doesNotMatch(raceSelf,/(?:^|\n)\.kona-user-menu\{/);
  assert.doesNotMatch(hall,/\.race-self-experience|\.race-self-controls/);
  assert.doesNotMatch(hallMobile,/\.race-self-experience|\.race-self-controls/);
  assert.doesNotMatch(entry,/\.race-self-experience|\.race-self-controls/);
});
test('install and update UI belong to consumer system CSS, not world CSS',()=>{
  assert.match(system,/#appSheet/);assert.match(system,/#updateBar/);
  assert.doesNotMatch(hall,/#appSheet|#updateBar/);
  assert.doesNotMatch(hallMobile,/#appSheet|#updateBar/);
});
test('world interaction chrome remains world-owned',()=>{
  for(const selector of ['#joy','#rail','#tourPill']) assert.match(hall+hallMobile,new RegExp(selector.replace('#','\\#')));
  assert.doesNotMatch(shell,/#joy\{|#tourPill\{/);
});

// RC8 final rerun marker: validates frozen go-live candidate after source reconciliation.
