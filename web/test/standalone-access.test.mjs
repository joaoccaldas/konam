import test from 'node:test';import assert from 'node:assert/strict';
import {standaloneDestination} from '../src/standalone-access.js';import {emptyProgression} from '../src/engine/progression.js';
test('direct SLX viewer redirects below level three and preserves entitled access',()=>{const state=emptyProgression();state.level=2;assert.equal(standaloneDestination('Speedmax_SLX_Museum.html',{state}),'Studio.html?p=canyon-slx-2027');state.level=3;assert.equal(standaloneDestination('Speedmax_SLX_Museum.html',{state}),null);});
