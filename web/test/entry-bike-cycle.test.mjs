import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src=fs.readFileSync(new URL('../src/ui/visual-primitives.js',import.meta.url),'utf8');

test('Another bike advances deterministically and updates visible bike identity',()=>{
  assert.match(src,/currentIndex=.*findIndex/);
  assert.match(src,/\(currentIndex\+1\)%catalog\.bikes\.length/);
  assert.doesNotMatch(src,/entry-livery[^\n]*chooseEntryPreview/);
  assert.match(src,/title\.textContent=selected\.label/);
  assert.match(src,/label\.textContent=\[selected\.brand,selected\.year\]/);
});
