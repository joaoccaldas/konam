import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const entry=fs.readFileSync(new URL('../src/entry.js',import.meta.url),'utf8');

test('first-run handoff is direct, calm and does not force install or orientation',()=>{
  assert.doesNotMatch(entry,/learning to build a real app/i);
  assert.doesNotMatch(entry,/arrow points somewhere stupid/i);
  assert.match(entry,/onContinue:\(\)=>enterApp\('home'\)/);
  assert.doesNotMatch(entry,/step==='install'|onboarding-handoff|data-handoff-continue/);
});
