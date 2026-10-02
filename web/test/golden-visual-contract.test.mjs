import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const shell=fs.readFileSync(new URL('../src/ui/kona-shell.js',import.meta.url),'utf8');
const landing=fs.readFileSync(new URL('../landing.template.html',import.meta.url),'utf8');
test('mobile IA stays at five canonical destinations',()=>{const labels=['Home','Discover','Garage','Plan','Me'];for(const x of labels)assert.match(shell,new RegExp('>'+x+'<'));});
test('landing retains one person-first build action',()=>{const n=(landing.match(/id="buildSelf"/g)||[]).length;assert.equal(n,1);});
test('landing declares responsive viewport and install manifest',()=>{assert.match(landing,/viewport-fit=cover/);assert.match(landing,/manifest\.webmanifest/);});
