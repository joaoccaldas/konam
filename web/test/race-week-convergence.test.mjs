import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL('../../'+p,import.meta.url),'utf8');

test('Home puts the museum before supporting race-week context without duplicating Plan',()=>{
  const home=read('web/src/ui/home.js');
  for(const phrase of ['KONA NOW · RACE WEEK','The Intern’s reading room.','Just landed?']) assert.ok(home.includes(phrase),phrase);
  assert.equal((home.match(/What matters next\./g)||[]).length,0,'Kona Now should not duplicate the hero Plan action');
  assert.ok(home.indexOf('KONA.M · THE 3D MUSEUM')<home.indexOf('KONA NOW · RACE WEEK'),'Museum must precede supporting content');
  assert.match(home,/data-home-feed/);
  assert.match(home,/data-home-travel/);
  const shell=read('web/src/ui/kona-shell.js');
  assert.match(shell,/openFeed:\(\)=>feed\('home'\)/);
  assert.match(shell,/openTravel:\(\)=>travel\('home'\)/);
});

test('first bike onboarding uses canonical Garage and level rewards, not a second collection store',()=>{
  const bike=read('web/src/ui/onboarding-bike.js');
  assert.match(bike,/LEVELS/);
  assert.match(bike,/addToGarage/);
  assert.match(bike,/canonicalProductId/);
  assert.match(bike,/EQUIPMENT_ADDED/);
  assert.doesNotMatch(bike,/localStorage|collection.*setItem/i);
  assert.match(bike,/not a claim that you own the physical bike/i);
  const entry=read('web/src/entry.js');
  assert.match(entry,/paintQuest\('bike'\)/);
});

test('return feedback is one-tap, rewarded and never stores free text',()=>{
  const engine=read('web/src/engine/return-journey.js');
  const ui=read('web/src/ui/return-journey.js');
  const progression=JSON.parse(read('museum/game/progression-v2.json'));
  assert.match(engine,/visits>=4&&!s\.raceWeekFeedbackAsked/);
  assert.match(ui,/FEEDBACK_RESPONSE/);
  assert.match(ui,/feedback_useful_yes/);
  assert.match(ui,/feedback_useful_no/);
  const shell=read('web/src/ui/kona-shell.js');
  assert.match(shell,/title\.textContent==='Now'[^\n]*returnJourney\.maybeShow\(\)/,'return feedback must be reachable from the renamed Now surface');
  assert.doesNotMatch(ui,/<textarea|type="text"/);
  assert.equal(progression.events.FEEDBACK_RESPONSE.xp,10);
  assert.equal(progression.events.FEEDBACK_RESPONSE.repeat,'once-per-prompt');
});

test('entry is explicitly a beta and provides optional account access',()=>{
  const entry=read('web/landing.template.html');
  assert.match(entry,/KAILUA-KONA · BETA/);
  assert.match(entry,/id="entrySignIn"/);
  assert.match(entry,/>What is Kona\.m\?<\/a>/);
});
