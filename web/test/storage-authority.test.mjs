import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const progression=fs.readFileSync(new URL('../src/engine/progression.js',import.meta.url),'utf8');
const raceSetup=fs.readFileSync(new URL('../src/studio/race-setup.js',import.meta.url),'utf8');
const profile=fs.readFileSync(new URL('../src/engine/profile.js',import.meta.url),'utf8');

test('profile progression and RaceSetup persist only through storage.js',()=>{
  for(const [name,src] of [['profile',profile],['progression',progression],['raceSetup',raceSetup]]){
    assert.match(src,/storage\.js/);
    assert.doesNotMatch(src,/localStorage\.(?:getItem|setItem|removeItem)/,name+' bypassed storage.js');
  }
});
test('modern state modules do not own speedmax storage keys',()=>{
  assert.doesNotMatch(progression,/speedmax\.progression/);
  assert.doesNotMatch(raceSetup,/speedmax\.raceSetup/);
  assert.doesNotMatch(profile,/const KEY = 'speedmax\./);
});
