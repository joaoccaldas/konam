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

import {waitForRoomFrame} from '../src/engine/asset-readiness.js';
function frameHarness(){
 let next=0;const frames=new Map(),timers=new Map();
 return {options:{requestFrame:cb=>{frames.set(++next,cb);return next;},cancelFrame:id=>frames.delete(id),setTimer:cb=>{timers.set(++next,cb);return next;},clearTimer:id=>timers.delete(id)},
 tick(){const batch=[...frames.values()];frames.clear();batch.forEach(cb=>cb());},
 expire(){[...timers.values()].forEach(cb=>cb());},pending:()=>frames.size+timers.size};
}
test('entry waits for requested identity, assets and an actual submitted frame',async()=>{
 const h=frameHarness();let receipt={roomId:'hall',assets:'ready',serial:5},done=false;
 const pending=waitForRoomFrame(()=>receipt,{room:'beast',identity:'room:konam:breitling-kona',...h.options}).then(r=>{done=true;return r;});
 h.tick();await Promise.resolve();assert.equal(done,false);
 receipt={roomId:'beast',identity:'room:konam:nor3-winter',assets:'ready',serial:6};h.tick();await Promise.resolve();assert.equal(done,false);
 receipt.identity='room:konam:breitling-kona';receipt.assets='loading';h.tick();await Promise.resolve();assert.equal(done,false);
 receipt.assets='ready';receipt.serial=0;h.tick();await Promise.resolve();assert.equal(done,false);
 receipt.serial=7;h.tick();assert.equal((await pending).serial,7);assert.equal(h.pending(),0);
});
test('failed assets for another room do not fail the selected room',async()=>{
 const h=frameHarness();let receipt={roomId:'hall',assets:'unavailable',serial:1};
 const pending=waitForRoomFrame(()=>receipt,{room:'pier',...h.options});
 receipt={roomId:'pier',assets:'ready',serial:2};h.tick();assert.equal((await pending).roomId,'pier');assert.equal(h.pending(),0);
});
test('failed selected assets retain a visible failure and dispose the observer',async()=>{
 const h=frameHarness();const pending=waitForRoomFrame(()=>({roomId:'beast',assets:'unavailable',serial:1}),{room:'beast',...h.options});
 await assert.rejects(pending,/Required room assets unavailable/);assert.equal(h.pending(),0);
});
test('entry has a real deadline even when animation frames stop',async()=>{
 const h=frameHarness();const pending=waitForRoomFrame(()=>undefined,{room:'hall',...h.options});h.expire();
 await assert.rejects(pending,/still loading/);assert.equal(h.pending(),0);
});
test('invalid receipt reads fail without a leftover frame or timer',async()=>{
 const h=frameHarness();await assert.rejects(waitForRoomFrame(()=>{throw Error('receipt missing');},{room:'hall',...h.options}),/receipt missing/);assert.equal(h.pending(),0);
});
