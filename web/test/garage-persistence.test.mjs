import test from 'node:test';
import assert from 'node:assert/strict';
import { addToGarage, groupGarage, readGarage, removeFromGarage } from '../src/engine/garage.js';
import { emptyProgression, writeProgression } from '../src/engine/progression.js';

function memory(seed={}) {
  const m=new Map(Object.entries(seed));
  return { getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k) };
}

test('Garage persists canonical UserEquipment records',()=>{
  const storage=memory();
  const r=addToGarage('canyon-cfr-2027',{relationship:'dream',storage});
  assert.equal(r.added,true);
  assert.equal(r.item.entity_type,'user-equipment');
  assert.equal(r.item.product_id,'product:canyon-cfr-2027');
  assert.equal(readGarage(storage).length,1);
  assert.equal(groupGarage(readGarage(storage)).dream.length,1);
  assert.notEqual(storage.getItem('kona.userEquipment.v1'),null);
  removeFromGarage(r.item.id,storage);
  assert.equal(readGarage(storage).length,0);
});

test('Garage add is idempotent per product and relationship',()=>{
  const storage=memory();
  addToGarage('canyon-cfr-2027',{relationship:'try',storage});
  const again=addToGarage('canyon-cfr-2027',{relationship:'try',storage});
  assert.equal(again.added,false);
  assert.equal(readGarage(storage).length,1);
});

test('owned bike is locked until level 2 while dream remains open',()=>{
  const storage=memory();
  const locked=addToGarage('canyon-cfr-2027',{relationship:'owned',storage});
  assert.equal(locked.locked,true);
  assert.equal(readGarage(storage).length,0);
  const p=emptyProgression();p.xp=40;p.level=2;p.level_name='Explorer';writeProgression(p,storage);
  const owned=addToGarage('canyon-cfr-2027',{relationship:'owned',storage});
  assert.equal(owned.added,true);
});
