import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../src/entry.js',import.meta.url),'utf8');

test('returning Home reads canonical RaceIdentity through storage adapter',()=>{
  assert.match(source,/readStorage\('raceIdentity'\)/);
  assert.match(source,/Continue your Kona/);
});

test('first visit follows questions, avatar and install handoff before Home',()=>{
  assert.match(source,/step==='questions'/);
  assert.match(source,/paintQuest\(firstRunStep\(\)\)/);
  assert.match(source,/onDone:\(\)=>paintQuest\('avatar'\)/);
  assert.match(source,/onContinue:\(\)=>paintQuest\('install'\)/);
  assert.match(source,/data-handoff-continue[\s\S]*enterApp\('home'\)/);
  assert.doesNotMatch(source,/paintQuest\('intent'\)/);
});

test('returning identity remains private by default in copy',()=>{
  assert.match(source,/stays private on this device/);
});
