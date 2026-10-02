import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const entry=fs.readFileSync(new URL('../src/entry.js',import.meta.url),'utf8');
const registration=fs.readFileSync(new URL('../src/ui/avatar-registration.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../landing.template.html',import.meta.url),'utf8');
const shell=fs.readFileSync(new URL('../src/ui/kona-shell.js',import.meta.url),'utf8');
const system=fs.readFileSync(new URL('../styles/system.css',import.meta.url),'utf8');
const studio=fs.readFileSync(new URL('../studio.template.html',import.meta.url),'utf8');
const hardener=fs.readFileSync(new URL('../../tools/harden_pages.mjs',import.meta.url),'utf8');

test('landing always exposes Enter, Sign in and Install',()=>{
  assert.match(html,/id="buildSelf"/);assert.match(html,/id="entrySignIn"/);assert.match(html,/id="entryInstall"/);
});
test('one helper leaves intro and supports canonical consumer routes',()=>{
  assert.match(entry,/function enterApp\(first = 'home'\)/);
  assert.match(entry,/intro\?\.setAttribute\('hidden',''\)/);
  for(const route of ['garage','collection','discover','plan','me','feed','travel']) assert.match(entry,new RegExp("first === '"+route+"'"));
  assert.match(entry,/shell\.now/);assert.match(entry,/shell\.me/);
});
test('returning Continue uses canonical Home entry whether RaceIdentity exists or onboarding was seen',()=>{
  assert.match(entry,/readStorage\('onboarding'\).*seen/);
  assert.match(entry,/returningVisit/);
  assert.match(entry,/Continue your Kona/);
  assert.match(entry,/enterApp\(\)/);
});
test('avatar setup can be escaped and does not trap the visitor',()=>{
  assert.match(registration,/data-reg-back/);
  assert.match(entry,/onBack:.*entry-landing|setEntryMode\('landing'\)/s);
  assert.match(entry,/onContinue:\(\)=>paintQuest\('install'\)/);
  assert.match(entry,/data-handoff-continue[\s\S]*enterApp\('home'\)/);
});
test('sign in is optional and exposes Continue without account',()=>{
  assert.match(entry,/Continue without account/);assert.match(entry,/continueLocal/);assert.match(entry,/enterApp\('home'\)/);
});
test('P0 entry uses canonical storage adapter, never raw localStorage',()=>{
  assert.match(entry,/readStorage/);
  assert.equal(/localStorage/.test(entry),false);
  assert.equal(/speedmax\.(?:entryIntent|konaSelf)/.test(entry),false);
});

test('User Studio is reachable from every primary surface',()=>{
  assert.match(shell,/data-user-studio/);
  assert.match(shell,/routeToUserStudio/);
  assert.match(entry,/openUserStudio:\(\)=>enterApp\('me'\)/);
  assert.equal(/entry-landing \.kona-user-menu[^\n]*display:none/.test(system),false);
  assert.equal(/entry-quest \.kona-user-menu[^\n]*display:none/.test(system),false);
  assert.match(studio,/href="index\.html\?view=me"[^>]*aria-label="Back to User Studio"/);
});
