import test from 'node:test';
import assert from 'node:assert/strict';
import { readGameState, writeGameState, gameProgress, GAME_STATE_SCHEMA_VERSION } from '../src/engine/game-state.js';
function memory(seed={}){const m=new Map(Object.entries(seed));return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size;}};}
test('game state aggregates existing domain stores without deleting them',()=>{const s=memory({'speedmax.profile.v1':JSON.stringify({v:1,name:'Ana'}),'speedmax.passport.v1':JSON.stringify({v:1,stamps:{'bike:a':{at:1}},badges:{collector:1},xp:55,streak:2,best:3}),'speedmax.finds.v1':JSON.stringify({bib:true}),'speedmax.raceSetup.v1':JSON.stringify({v:1,bike:'bike:a'}),'speedmax.garage.v1':JSON.stringify([{id:'g1'}])});const state=readGameState(s);assert.equal(state.schema_version,GAME_STATE_SCHEMA_VERSION);assert.equal(state.profile.name,'Ana');assert.equal(state.progression.xp,55);assert.equal(state.garage.length,1);assert.notEqual(s.getItem('speedmax.passport.v1'),null);});
test('restore and progress summary are deterministic',()=>{const s=memory();writeGameState({schema_version:1,profile:{v:1,name:'Jo'},progression:{v:1,stamps:{'bike:a':{},'kona:2024':{},'find:bib':{},'part:fork':{}},badges:{first:1},xp:120,streak:4,best:4},finds:{bib:true},race_setup:{v:1,bike:'bike:a'},garage:[{id:'g1'},{id:'g2'}]},s);const p=gameProgress(readGameState(s));assert.deepEqual([p.xp,p.streak,p.stamps,p.badges,p.bikes,p.konaYears,p.hidden,p.parts,p.garage],[120,4,4,1,1,1,1,1,2]);});
test('unsupported cloud schema is rejected',()=>{assert.throws(()=>writeGameState({schema_version:99}),/Unsupported game state/);});


test('modern KONA graph fields round-trip through the canonical storage registry',()=>{
  const s=memory();
  const snapshot={
    schema_version:1,
    profile:{v:1,name:'Kai'},
    progression:{v:1,stamps:{},badges:{},xp:0,streak:0,best:0},
    finds:{},
    race_setup:null,
    garage:[],
    race_identity:{id:'race-identity:local:kona-2026',entity_type:'race-identity'},
    user_equipment:[{id:'equipment:local:dream:bike-a',product_id:'product:bike-a',relationship:'dream'}],
    kona_self:{bikeId:'bike-a'},
    entry_intent:{intent:'dreaming'},
    race_history:[{event_id:'event:test'}],
  };
  writeGameState(snapshot,s);
  const out=readGameState(s);
  assert.equal(out.race_identity.id,snapshot.race_identity.id);
  assert.equal(out.user_equipment[0].product_id,'product:bike-a');
  assert.equal(out.kona_self.bikeId,'bike-a');
  assert.equal(out.entry_intent.intent,'dreaming');
  assert.equal(out.race_history.length,1);
  assert.notEqual(s.getItem('kona.userEquipment.v1'),null);
});


test('failed cloud restore reports failure and rolls back writes',()=>{
  const s=memory();
  writeGameState({schema_version:1,profile:{name:'Before'},progression:{xp:7},finds:{bib:true}},s);
  const before=readGameState(s), original=s.setItem;
  let calls=0;
  s.setItem=(k,v)=>{if(++calls===3)throw new Error('QuotaExceededError');original(k,v);};
  assert.throws(()=>writeGameState({schema_version:1,profile:{name:'After'},progression:{xp:99},finds:{}},s),/previous progress was kept/);
  const after=readGameState(s);
  delete before.exported_at;delete after.exported_at;
  assert.deepEqual(after,before);
});
test('restoring an empty field does not resurrect a legacy value',()=>{
  const s=memory({'speedmax.profile.v1':JSON.stringify({name:'Legacy'})});
  writeGameState({schema_version:1,profile:null,progression:{},finds:{}},s);
  assert.equal(readGameState(s).profile,null);
});
