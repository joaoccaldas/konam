import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const shell=fs.readFileSync(new URL('../src/ui/kona-shell.js',import.meta.url),'utf8');
const landing=fs.readFileSync(new URL('../landing.template.html',import.meta.url),'utf8');
test('mobile IA retains five canonical destinations while progressively revealing them',()=>{
  for(const id of ['home','discover','garage','plan','me']) assert.match(shell,new RegExp('data-tab="'+id+'"'));
  assert.match(shell,/navigationForState/);
  assert.match(shell,/<span>Now<\/span>/);
});
test('landing has one dominant museum action and optional athlete setup',()=>{assert.equal((landing.match(/class="btn primary"/g)||[]).length,1);assert.match(landing,/class="btn primary" id="entryWorld"/);assert.match(landing,/class="btn text" id="buildSelf"/);});
test('landing declares responsive viewport and install manifest',()=>{assert.match(landing,/viewport-fit=cover/);assert.match(landing,/manifest\.webmanifest/);});
