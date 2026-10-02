import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const entry=fs.readFileSync(new URL('../src/entry.js',import.meta.url),'utf8');
const shell=fs.readFileSync(new URL('../src/ui/kona-shell.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../landing.template.html',import.meta.url),'utf8');
const harden=fs.readFileSync(new URL('../../tools/harden_pages.mjs',import.meta.url),'utf8');

test('landing exposes build and sign-in without requiring 3D',()=>{assert.match(html,/id="buildSelf"/);assert.match(html,/id="entrySignIn"/);});
test('first run moves through questions, avatar and install handoff without gear gates',()=>{
  assert.match(entry,/step==='questions'/);
  assert.match(entry,/paintQuest\(firstRunStep\(\)\)/);
  assert.match(entry,/renderOnboardingQuestions/);
  assert.match(entry,/renderAvatarRegistration/);
  assert.match(entry,/onContinue:\(\)=>paintQuest\('install'\)/);
  assert.match(entry,/data-handoff-continue[\s\S]*enterApp\('home'\)/);
  assert.doesNotMatch(entry,/data-race-picker/);
  assert.doesNotMatch(entry,/Choose your bike/);
  assert.doesNotMatch(entry,/Choose your shoes/);
});
test('contextual onboarding runs once and can be replayed',()=>{
  assert.match(shell,/readStorage\('onboarding'\).*seen/);
  assert.match(shell,/writeStorage\('onboarding','seen'\)/);
  assert.match(shell,/startTour/);
  assert.match(shell,/replayTour/);
  assert.match(shell,/tour:replayTour/);
});
test('sign-in remains optional and local-first',()=>{
  assert.match(entry,/Continue without account/);
  assert.match(entry,/sendMagicLink/);
  assert.match(entry,/enterApp\('home'\)/);
});
test('CSP allows the exact public Supabase project used by auth adapter',()=>assert.match(harden,/connect-src[^\n]*https:\/\/mtvpnoqwjpoqaiocrklq\.supabase\.co/));
test('entry source itself never imports Three.js',()=>{assert.equal(/from ['"]three/.test(entry),false);assert.equal(/app\/hall\.js/.test(entry),true);});

test('generated core bundle carries an entry continuation contract after deterministic sync',()=>{const bundle=fs.readFileSync(new URL('../../app/kona-core.js',import.meta.url),'utf8');assert.match(bundle,/Enter KONA|Continue your Kona/);});

test('entry uses tiny entry-data and defers museum-data until explicit 3D entry',()=>{
  assert.match(entry,/fetch\('app\/entry-data\.json'/);
  assert.match(entry,/ensureMuseumData/);
  assert.equal(/const dataReady = loadScript\('app\/museum-data\.js'\)/.test(entry),false);
});
