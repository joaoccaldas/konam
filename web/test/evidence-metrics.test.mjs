import test from 'node:test';import assert from 'node:assert/strict';import {evaluateMeasurements} from '../../tools/evidence-metrics.mjs';
const sample=()=>({measurements:[{id:'draws-1',metric:'draw calls',unit:'calls',source:'evidence/run-1',sha:'a'.repeat(40),baseline:48,candidate:24,direction:'lower',environment:{baseline:{scene:'same',device:'same'},candidate:{scene:'same',device:'same'}}}]});
test('calculates improvement only for matched contexts',()=>assert.equal(evaluateMeasurements(sample()).rows[0].improvement_percent,50));
test('rejects incomparable hardware or scenes',()=>{const x=sample();x.measurements[0].environment.candidate.device='other';assert.equal(evaluateMeasurements(x).rows[0].improvement_percent,null);});
test('rejects unpinned claims',()=>{const x=sample();x.measurements[0].sha='main';assert.equal(evaluateMeasurements(x).errors.length,1);});
test('does not infer from one-sided observations',()=>{const x=sample();delete x.measurements[0].candidate;assert.equal(evaluateMeasurements(x).rows[0].claim_state,'observed-not-comparable');});
test('missing document is explicitly invalid',()=>assert.equal(evaluateMeasurements({}).errors.length,1));
