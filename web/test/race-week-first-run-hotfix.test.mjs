import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=path.resolve(import.meta.dirname,'../..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');

test('race-week entry routes 3D through the canonical shell and hides unavailable sign-in',()=>{
  const landing=read('web/landing.template.html');
  const entry=read('web/src/entry.js');
  assert.match(landing,/id="entryWorld" href="\?room=hall"/);
  assert.doesNotMatch(landing,/id="entrySignIn"/);
  assert.doesNotMatch(landing,/>Sign in<\/button>/);
  assert.match(entry,/entryWorld/);
  assert.match(entry,/enterApp\('home'\)/);
  assert.match(entry,/openMuseum\('hall'\)/);
});

test('Garage personal equipment utility is never XP gated',()=>{
  const garage=read('web/src/ui/garage.js');
  assert.doesNotMatch(garage,/Bike ownership unlocks at Level 2/);
  assert.doesNotMatch(garage,/bikeUnlocked|ensureProgression/);
  assert.match(garage,/Choose your first bike/);
});

test('Block avatar keeps compatibility id but does not expose Minecraft as feature copy',()=>{
  const avatar=read('web/src/engine/avatar.js');
  assert.match(avatar,/id:'minecraft',label:'Blocky'/);
  assert.doesNotMatch(avatar,/label:'Minecraft'/);
});

test('PWA shortcut views are honored without returning-visit gating',()=>{
  const entry=read('web/src/entry.js');
  assert.match(entry,/\['home','garage','collection','discover','plan','me','feed','travel'\]\.includes\(q\.get\('view'\)\)\) enterApp\(q\.get\('view'\)\)/);
  assert.doesNotMatch(entry,/returningVisit && \['home','garage'/);
});

test('History Lane source composes image URLs at runtime rather than hard-coding a template token into src',()=>{
  const exp=read('web/src/exp/main.js');
  assert.match(exp,/src="\$\{esc\(D\.history\.dir\)\}\/\$\{esc\(cv\.id\)\}\.jpg"/);
});
