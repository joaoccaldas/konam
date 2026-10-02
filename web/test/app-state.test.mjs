import test from 'node:test';
import assert from 'node:assert/strict';
import {listAppState,exportAppState,eraseAppState,appStateSummary} from '../src/engine/app-state.js';

class MemoryStorage {
  constructor(entries={}) { this.m=new Map(Object.entries(entries)); }
  get length(){ return this.m.size; }
  key(i){ return [...this.m.keys()][i] ?? null; }
  getItem(k){ return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k,v){ this.m.set(k,String(v)); }
  removeItem(k){ this.m.delete(k); }
}

test('app state registry only includes owned keys and prefixes',()=>{
  const s=new MemoryStorage({
    'speedmax.profile.v1':'{}',
    'speedmax.raceSetup.v1':'{}',
    'speedmax.museum.v2.cfr.cfg':'{"scene":"kona"}',
    'unrelated.app':'keep'
  });
  assert.deepEqual(listAppState(s).map(x=>x.key),[
    'speedmax.museum.v2.cfr.cfg',
    'speedmax.profile.v1',
    'speedmax.raceSetup.v1'
  ]);
  const payload=JSON.parse(exportAppState(s));
  assert.equal(payload.schema_version,1);
  assert.equal(payload.entries['unrelated.app'],undefined);
  assert.equal(appStateSummary(s).records,3);
});

test('erase app state preserves unrelated localStorage',()=>{
  const s=new MemoryStorage({
    'speedmax.profile.v1':'{}',
    'speedmax.passport.v1':'{}',
    'speedmax.exp.tut.v1':'1',
    'other':'yes'
  });
  assert.equal(eraseAppState(s),3);
  assert.equal(s.getItem('other'),'yes');
  assert.equal(s.getItem('speedmax.profile.v1'),null);
});
