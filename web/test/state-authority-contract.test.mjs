import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const shell=fs.readFileSync(new URL('../src/ui/kona-shell.js',import.meta.url),'utf8');
const appState=fs.readFileSync(new URL('../src/engine/app-state.js',import.meta.url),'utf8');
const gameState=fs.readFileSync(new URL('../src/engine/game-state.js',import.meta.url),'utf8');

test('Garage is a shell surface, not a direct Studio destination',()=>{
  assert.match(shell,/data-tab="garage"/);
  assert.match(shell,/renderGarageSurface/);
  assert.doesNotMatch(shell,/<a href="Studio\.html#setup" data-tab="garage">/);
});

test('privacy export and cloud snapshot derive from canonical storage authority',()=>{
  assert.match(appState,/storageKeys/);
  assert.match(gameState,/readStorage/);
  assert.match(gameState,/user_equipment/);
  assert.match(gameState,/race_identity/);
});

test('Studio bike picker writes the canonical race setup from the 3D choice',()=>{
  const studio=fs.readFileSync(new URL('../src/studio/main.js',import.meta.url),'utf8');
  assert.match(studio,/productAccess/);
  assert.match(studio,/saveCurrentToSetup\(\{stay:true,announce:true\}\)/);
  assert.match(studio,/setSetupSlot\(raceSetup, 'bike', current\.product/);
  assert.doesNotMatch(studio,/localStorage\.setItem\([^\n]*bike/i);
});
