import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const shell=fs.readFileSync(new URL('../src/ui/kona-shell.js',import.meta.url),'utf8');
const home=fs.readFileSync(new URL('../src/ui/home.js',import.meta.url),'utf8');
const avatarHome=fs.readFileSync(new URL('../src/ui/avatar-home.js',import.meta.url),'utf8');
const raceCards=fs.readFileSync(new URL('../src/ui/race-cards.js',import.meta.url),'utf8');
const discover=fs.readFileSync(new URL('../src/ui/discover.js',import.meta.url),'utf8');
const catalog=fs.readFileSync(new URL('../src/engine/catalog.js',import.meta.url),'utf8');
const garage=fs.readFileSync(new URL('../src/ui/garage.js',import.meta.url),'utf8');
const plan=fs.readFileSync(new URL('../src/ui/plan.js',import.meta.url),'utf8');
const me=fs.readFileSync(new URL('../src/ui/me.js',import.meta.url),'utf8');
const entry=fs.readFileSync(new URL('../src/entry.js',import.meta.url),'utf8');
const visual=fs.readFileSync(new URL('../visual-evidence-v2.mjs',import.meta.url),'utf8');
const registration=fs.readFileSync(new URL('../src/ui/avatar-registration.js',import.meta.url),'utf8');
const onboarding=fs.readFileSync(new URL('../src/ui/onboarding-questions.js',import.meta.url),'utf8');
const admin=fs.readFileSync(new URL('../src/ui/admin-assets.js',import.meta.url),'utf8');
const adminBuild=fs.readFileSync(new URL('../../tools/build_admin_assets.mjs',import.meta.url),'utf8');

test('shell orchestrates Home, User Studio, Discover, Garage, Plan and companion surfaces',()=>{
  for(const marker of ['renderHomeSurface','renderAvatarHome','renderDiscoverSurface','renderGarageSurface','renderPlanSurface','renderFeed','renderTravel']) assert.match(shell,new RegExp(marker));
  assert.doesNotMatch(shell,/Every room, one museum/);
});

test('Discover is lightweight before optional 3D',()=>{
  assert.match(discover,/loadPublicCatalog/);
  assert.match(catalog,/integrations\/public-catalog\.json/);
  assert.doesNotMatch(discover,/__ROOMS|__BRANDROOMS|__gallery|museum-data\.js|hall\.js/);
  assert.match(discover,/Enter the world/);
});

test('Garage and Progress resolve Product presentation from the shared public projection',()=>{
  assert.match(garage,/getPublicProduct/);
  assert.match(me,/getPublicProduct/);
  assert.doesNotMatch(garage,/BIKES|SHOES|questLabels/);
  assert.doesNotMatch(me,/BIKES|SHOES|questLabels/);
});

test('Home is lightweight while User Studio owns personal depth and tour replay',()=>{
  assert.match(home,/data-home-self/);
  assert.match(home,/YOUR RACE SELF/);
  assert.doesNotMatch(home,/race-self-stage\.js|hall\.js|museum-data\.js/);
  for(const control of ['Avatar','Bike Studio','Races','Settings','Quick tour','The Feed','Travel to Kona']) assert.match(avatarHome,new RegExp(control));
  assert.doesNotMatch(avatarHome,/Canyon Museum|Discover Kona|Race week/);
  assert.match(avatarHome,/Collection/);
  assert.match(avatarHome,/Progress/);
  assert.match(avatarHome,/openTour/);
  assert.match(avatarHome,/race-self-controls/);
  assert.match(avatarHome,/app\/race-self-stage\.js/);
  assert.doesNotMatch(avatarHome,/app\/hall\.js|museum-data\.js|__museum/);
  assert.match(raceCards,/Search IRONMAN races/);
});

test('Plan is lightweight and independent of museum globals',()=>{
  assert.match(plan,/race_week/);
  assert.doesNotMatch(plan,/__EVENT|__ISLAND|museum-data\.js|hall\.js/);
  assert.doesNotMatch(shell,/__EVENT|__ISLAND/);
});

test('Progress owns no independent persistence and keeps Passport compatibility only as an API alias',()=>{
  assert.match(me,/race_identity/);
  assert.match(me,/renderProgressSurface/);
  assert.match(me,/renderPassportSurface/);
  assert.doesNotMatch(me,/localStorage|writeStorage/);
  assert.doesNotMatch(shell,/gameProgress|readGameState|sendMagicLink|backupGameState/);
});

test('entry has questions, avatar, install handoff and replayable contextual onboarding',()=>{
  assert.match(entry,/function enterApp\(first = 'home'\)/);
  assert.match(entry,/function firstRunStep\(\)/);
  assert.match(entry,/paintQuest\(firstRunStep\(\)\)/);
  assert.match(entry,/renderOnboardingQuestions/);
  assert.match(entry,/renderAvatarRegistration/);
  assert.match(entry,/onContinue:\(\)=>paintQuest\('install'\)/);
  assert.match(entry,/if\(step==='install'\)/);
  assert.match(entry,/data-install-app/);
  assert.match(entry,/Turn your phone sideways/);
  assert.match(onboarding,/What brings you to Kona/);
  assert.match(onboarding,/ONBOARDING_ANSWER/);
  assert.doesNotMatch(entry,/data-race-picker/);
  assert.match(shell,/tour:replayTour/);
  assert.match(shell,/initReturnJourney/);
  assert.match(shell,/writeStorage\('onboarding','seen'\)/);
  assert.match(registration,/TRISUIT LAYOUT/);
  assert.match(registration,/data-reg-overlay/);
});

test('Home button means Home and Admin Assets stays a generated, Me-only capability',()=>{
  assert.match(shell,/\[data-tab=home\]'\)\.onclick=now/);
  assert.match(shell,/renderAdminAssets/);
  assert.match(admin,/app\/admin-assets\.json/);
  for(const source of ['museum/catalog/products.json','museum/world/rooms.json','museum/world/brand_rooms.json','museum/world/decorations.json']){
    assert.ok(adminBuild.includes(source),'admin projection must derive from '+source);
  }
});

test('visual evidence covers launch, companion and museum-return states across Random mode',()=>{
  assert.match(visual,/\['light','dark','random'\]/);
  for(const view of ['landing','sign-in','onboarding-profile','avatar-registration','onboarding-tour','home','user-studio','avatar-editor','discover','garage','plan','progress','feed','travel','museum-return-home','bike-studio']) assert.match(visual,new RegExp(view));
});
