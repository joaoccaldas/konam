import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const entry=fs.readFileSync(new URL('../src/entry.js',import.meta.url),'utf8');

test('product onboarding keeps the Intern voice out of trust-critical handoff copy',()=>{
  assert.doesNotMatch(entry,/learning to build a real app/i);
  assert.doesNotMatch(entry,/arrow points somewhere stupid/i);
  assert.match(entry,/browser menu to install or add Kona\.m to your Home Screen/);
  assert.match(entry,/3D world is built for landscape/);
});
