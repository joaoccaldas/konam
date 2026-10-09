import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildFinds,readFinds,writeFinds} from '../src/finds.js';
import {emptyProgression,applyEvent} from '../src/engine/progression.js';
const memory=seed=>{const m=new Map(Object.entries(seed));return{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};};
const context=()=>({scene:new THREE.Scene(),loader:{loadAsync:async()=>({scene:new THREE.Group()})},pickables:[]});
test('a Find earned on Now is also kept in the world without paying again',async()=>{
 const previous=globalThis.localStorage;
 try{
  const state=applyEvent(emptyProgression(),{type:'FIND_DISCOVERED',id:'first-find:lava',subject:'find:shore:lava'}).state;
  globalThis.localStorage=memory({'kona.progression.v1':JSON.stringify(state)});
  assert.deepEqual(readFinds(),['lava']);
  const api=await buildFinds(context()),rock=api.spots.find(s=>s.id==='lava');
  assert.equal(rock.found,true);assert.equal(rock.holder.visible,false);assert.equal(api.take(rock),false);
  assert.equal(JSON.parse(localStorage.getItem('kona.progression.v1')).xp,state.xp);
 }finally{globalThis.localStorage=previous;}
});
test('a failed canonical save leaves the world object available to retry',async()=>{
 const previous=globalThis.localStorage;
 try{
  const state=emptyProgression();globalThis.localStorage=memory({'kona.progression.v1':JSON.stringify(state)});
  const api=await buildFinds(context()),rock=api.spots.find(s=>s.id==='lava');
  localStorage.setItem=()=>{throw new Error('quota');};
  assert.equal(api.take(rock),false);assert.equal(rock.found,false);assert.equal(rock.holder.visible,true);
  assert.equal(api.kept.has('lava'),false);
 }finally{globalThis.localStorage=previous;}
});
test('legacy arrays remain readable, and new Find state uses a backup-compatible record',()=>{
 const previous=globalThis.localStorage;
 try{
  globalThis.localStorage=memory({'speedmax.finds.v1':'["bib"]'});assert.deepEqual(readFinds(),['bib']);
  writeFinds(['bib','lava']);assert.deepEqual(readFinds(),['lava','bib']);
  assert.deepEqual(JSON.parse(localStorage.getItem('kona.finds.v1')),{bib:true,lava:true});
  assert.equal(localStorage.getItem('speedmax.finds.v1'),'["bib"]');
 }finally{globalThis.localStorage=previous;}
});
