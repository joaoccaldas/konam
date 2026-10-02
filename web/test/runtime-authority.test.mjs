import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const entry=fs.readFileSync(new URL('../src/entry.js',import.meta.url),'utf8');
const world=fs.readFileSync(new URL('../src/landing.js',import.meta.url),'utf8');

test('consumer core is sole Profile Settings and KONA shell constructor',()=>{
  assert.match(entry,/createProfile\(\)/);
  assert.match(entry,/initSettings\(/);
  assert.match(entry,/initKonaShell\(/);
  assert.doesNotMatch(world,/createProfile\(\)/);
  assert.doesNotMatch(world,/initSettings\(/);
  assert.doesNotMatch(world,/initKonaShell\(/);
});
test('world consumes shared authorities and only publishes renderer effects',()=>{
  assert.match(world,/window\.__konaProfile/);
  assert.match(world,/window\.__konaSettingsUI/);
  assert.match(world,/window\.__konaShell/);
  assert.match(world,/window\.__konaWorldSettings/);
  assert.match(entry,/window\.__konaWorldSettings\?\.onQuality/);
});
