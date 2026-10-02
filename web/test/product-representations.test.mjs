import test from 'node:test';import assert from 'node:assert/strict';
import {representationFor,representationManifest,representationBudget} from '../src/world/product-representations.js';
test('one product can have distinct museum and studio assets',()=>{const p={id:'bike:x',representations:{museum:'x-lite.glb',hero:'x-hero.glb',engineering:'x-eng.glb'}};assert.equal(representationFor(p,'museum'),'x-lite.glb');assert.equal(representationFor(p,'engineering'),'x-eng.glb');});
test('legacy single GLB remains backward compatible',()=>{const p={id:'bike:x',glb:'x.glb'};const m=representationManifest(p);assert.equal(m.museum,'x.glb');assert.equal(m.hero,'x.glb');assert.equal(m.engineering,'x.glb');});
test('low-device budgets are stricter',()=>assert.ok(representationBudget('hero','low')<representationBudget('hero','high')));
test('unknown state never invents an asset',()=>assert.equal(representationFor({id:'x'},'party'),null));
