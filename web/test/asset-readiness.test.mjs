import test from 'node:test';
import assert from 'node:assert/strict';
import {createAssetReadiness} from '../src/engine/asset-readiness.js';

test('concurrent requests share loading work and cannot report ready early', async () => {
 const state=createAssetReadiness();let finish,calls=0;
 const load=()=>{calls++;return new Promise(resolve=>{finish=resolve;});};
 const first=state.run('room',load), second=state.run('room',load);
 assert.equal(first,second);assert.equal(state.state('room'),'loading');
 await Promise.resolve();assert.equal(calls,1);finish('model');
 assert.equal(await second,'model');assert.equal(state.state('room'),'ready');
});
test('failed required assets remain unavailable and reject later requests',async()=>{
 const state=createAssetReadiness(),error=new Error('model missing');
 await assert.rejects(state.run('room',()=>Promise.reject(error)),/model missing/);
 assert.equal(state.state('room'),'unavailable');
 await assert.rejects(state.run('room',()=>assert.fail('no silent fallback')),/model missing/);
});
