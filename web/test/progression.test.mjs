import test from 'node:test';
import assert from 'node:assert/strict';
import { applyEvent, canUnlock, migratePassport, levelFor, COLLECTIBLES, UNLOCKS, emptyProgression } from '../src/engine/progression.js';

test('xp maps onto named levels and does not skip the table', () => {
  assert.equal(levelFor(0).name, 'Visitor');
  assert.ok(levelFor(0).rewards.some(r=>r.type==='bike'&&r.id==='canyon-cfr-2027'));
  assert.equal(levelFor(40).name, 'Explorer');
  assert.equal(levelFor(2000).name, 'Kahuna');
  assert.equal(levelFor(99999).level, 10);
});

test('legacy night finds remain intact while V2 relic registry expands collectibles', () => {
  const night = COLLECTIBLES.filter(c => ['find:lava:','find:camp13:','find:tunnel:'].some(prefix=>c.id.startsWith(prefix)));
  assert.equal(night.length, 9);
  assert.equal(new Set(night.map(c => c.id)).size, 9);
  assert.ok(COLLECTIBLES.filter(c=>c.id.startsWith('relic:')).length>=20);
  assert.ok(COLLECTIBLES.every(c => ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'].includes(c.rarity)));
});

test('a find pays once and a repeat event does not', () => {
  const first = applyEvent(emptyProgression(), { type: 'FIND_DISCOVERED', subject: 'find:tunnel:stopwatch' });
  assert.equal(first.granted.xp, 1500);
  assert.equal(first.state.credits, 2500);
  assert.equal(first.state.level_name, 'Legend');
  const again = applyEvent(first.state, { type: 'FIND_DISCOVERED', subject: 'find:tunnel:stopwatch' });
  assert.equal(again.duplicate, true);
  assert.equal(again.state.xp, first.state.xp);
  assert.equal(again.state.ledger.length, 1);
});

test('spend cannot drive credits below zero', () => {
  const saved = applyEvent(emptyProgression(), { type: 'ROOM_COMPLETED', subject: 'hall' });
  const broke = applyEvent(saved.state, { type: 'CURRENCY_SPENT', subject: 'frame', amount: 999 });
  assert.equal(broke.error, 'insufficient-credits');
  assert.equal(broke.state.credits, saved.state.credits);
  const ok = applyEvent(saved.state, { type: 'CURRENCY_SPENT', subject: 'frame', amount: 40 });
  assert.equal(ok.state.credits, 0);
});

test('passport migration keeps xp and does not pay old finds again', () => {
  const state = migratePassport({
    passport: { v: 1, xp: 55, streak: 2, profile: { name: 'Ana' }, stamps: { 'find:lava:raven': { at: 1 } }, discoveries: ['cfr'] },
    finds: ['bib'],
  });
  assert.equal(state.access_tier, 'passport');
  assert.equal(state.xp, 55);
  assert.ok(state.discoveries.includes('bike:cfr'));
  assert.ok(state.discoveries.includes('find:shore:bib'));
  const again = applyEvent(state, { type: 'FIND_DISCOVERED', subject: 'find:lava:raven' });
  assert.equal(again.duplicate, true);
  assert.equal(again.state.xp, 55);
});

test('unlocks follow requirements and do not reopen', () => {
  let state = emptyProgression();
  state.access_tier = 'passport';
  state.xp = 200;
  state.level = 4;
  state.level_name = 'Racer';
  for (let i = 0; i < 5; i++) state.discoveries.push(`find:test:${i}`);
  const unlock = UNLOCKS.find(u => u.id === 'unlock:archive-frame');
  assert.equal(canUnlock(state, unlock), true);
  const granted = applyEvent(state, { type: 'ROOM_COMPLETED', subject: 'hall' });
  assert.ok(granted.state.unlocks.includes('unlock:archive-frame'));
  assert.equal(canUnlock(granted.state, unlock), false);
});


test('onboarding answers personalize without levelling the player',()=>{
  let state=emptyProgression();
  for(const q of ['intent','history','energy','movie','camp']) state=applyEvent(state,{type:'ONBOARDING_ANSWER',id:'onboarding:'+q,subject:q}).state;
  assert.equal(state.xp,5);
  assert.equal(state.level,1);
  const duplicate=applyEvent(state,{type:'ONBOARDING_ANSWER',id:'onboarding:intent',subject:'intent'});
  assert.equal(duplicate.duplicate,true);
  assert.equal(duplicate.state.xp,5);
});

test('starter bike is available at level 1 and first discovery creates the first level-up',()=>{
  const starter=levelFor(0).rewards.find(r=>r.type==='bike'&&r.id==='canyon-cfr-2027');
  assert.ok(starter,'starter bike should not depend on questionnaire XP');
  let state=emptyProgression();
  for(const q of ['intent','history','energy','movie','camp']) state=applyEvent(state,{type:'ONBOARDING_ANSWER',id:'onboarding:'+q,subject:q}).state;
  state=applyEvent(state,{type:'EQUIPMENT_ADDED',id:'onboarding-bike:canyon-cfr-2027:dream',subject:'canyon-cfr-2027',relationship:'dream'}).state;
  assert.equal(state.xp,15);
  assert.equal(state.level,1);
  state=applyEvent(state,{type:'FIND_DISCOVERED',id:'first-find',subject:'find:shore:lava'}).state;
  assert.equal(state.xp,65);
  assert.equal(state.level,2);
  assert.equal(state.level_name,'Explorer');
});
