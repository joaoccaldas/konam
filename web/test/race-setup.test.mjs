import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createRaceSetup, validateRaceSetup, normaliseRaceSetup, setupFromBike,
  encodeRaceSetup, decodeRaceSetup, completedSlots, RACE_SETUP_KEY,
  RACE_SETUP_SCHEMA_VERSION, canEquip, setSetupSlot, clearSetupSlot, createRaceSetupStore
} from '../src/studio/race-setup.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CAT = JSON.parse(fs.readFileSync(path.join(root, 'museum/catalog/products.json'), 'utf8'));
const bike = CAT.products.find(p => p.type === 'bike');

test('RaceSetup canonical shape is versioned, brand-agnostic and slot-based', () => {
  const s = setupFromBike(bike, 'abc', 'kona', CAT.products);
  assert.equal(s.schema_version, RACE_SETUP_SCHEMA_VERSION);
  assert.equal(s.event_id, 'kona-2026');
  assert.equal(s.slots.bike.product_id, bike.id);
  assert.deepEqual(s.slots.bike.configuration, { look:'abc', scene:'kona' });
  assert.deepEqual(s.slots.wheel, { source:'bike', product_id:bike.id });
  assert.equal(s.slots.helmet, null);
  assert.equal(s.slots.shoe, null);
  assert.equal(completedSlots(s), 2);
  assert.equal(JSON.stringify(s).includes(bike.brand), false);
});

test('generic compatibility is type/capability driven, never brand driven', () => {
  assert.equal(canEquip(bike, 'bike'), true);
  assert.equal(canEquip({ id:'shoe-1', type:'shoe' }, 'shoe'), true);
  assert.equal(canEquip({ id:'helmet-1', product_type:'helmet', capabilities:['inspect','equip'] }, 'helmet'), true);
  assert.equal(canEquip({ id:'helmet-2', product_type:'helmet', capabilities:['inspect'] }, 'helmet'), false);
  assert.equal(canEquip({ id:'nike-x', type:'shoe', brand:'Nike' }, 'bike'), false);
  assert.equal(canEquip({ id:'canyon-x', type:'bike', brand:'Canyon' }, 'shoe'), false);
});

test('setSetupSlot and clearSetupSlot compose without brand-specific logic', () => {
  let s = createRaceSetup();
  s = setSetupSlot(s, 'bike', bike, { look:'x', scene:'night' }, CAT.products);
  assert.equal(s.slots.bike.product_id, bike.id);
  assert.equal(s.slots.wheel.source, 'bike');
  s = clearSetupSlot(s, 'bike', CAT.products);
  assert.equal(s.slots.bike, null);
  assert.equal(s.slots.wheel, null);
});

test('deep link round-trips and rejects unknown products/hostile state', () => {
  const s = setupFromBike(bike, 'safe-look', 'night', CAT.products);
  const enc = encodeRaceSetup(s, CAT.products);
  const back = decodeRaceSetup(enc, CAT.products);
  assert.equal(back.slots.bike.product_id, bike.id);
  assert.equal(back.slots.bike.configuration.scene, 'night');
  assert.equal(back.slots.bike.configuration.look, 'safe-look');

  const bad = Buffer.from(JSON.stringify({ v:1, e:'kona-2026', s:{ b:{ p:'not-a-product', l:'<script>', c:'javascript:alert(1)' } } })).toString('base64url');
  assert.equal(decodeRaceSetup(bad, CAT.products), null);
  assert.equal(decodeRaceSetup('x'.repeat(1201), CAT.products), null);
});

test('canonical validation rejects wrong event and future unknown product injection', () => {
  assert.equal(validateRaceSetup({ schema_version:1, event_id:'evil', slots:{} }, CAT.products), null);
  const s = normaliseRaceSetup({
    schema_version:1, event_id:'kona-2026',
    slots:{
      bike:{ product_id:bike.id, configuration:{ look:'', scene:'kona' } },
      helmet:{ product_id:'evil', configuration:{ html:'<img>' } },
      shoe:{ product_id:'nike-whatever' }
    }
  }, CAT.products);
  assert.equal(s.slots.helmet, null);
  assert.equal(s.slots.shoe, null);
  assert.equal(s.slots.wheel.source, 'bike');
});

test('legacy branch V0 record migrates to canonical shape', () => {
  const old = { version:1, event:'kona-2026', bike:{ productId:bike.id, look:'old', scene:'lava' }, wheels:{ source:'bike', productId:bike.id }, helmet:null, shoes:null, updatedAt:12 };
  const s = normaliseRaceSetup(old, CAT.products);
  assert.equal(s.schema_version, 1);
  assert.equal(s.event_id, 'kona-2026');
  assert.equal(s.slots.bike.product_id, bike.id);
  assert.deepEqual(s.slots.bike.configuration, { look:'old', scene:'lava' });
  assert.equal(s.updated_at, 12);
});

test('persistence adapter survives reload and is isolated from profile state', () => {
  const db = new Map([['speedmax.profile.v1', JSON.stringify({ name:'Ana', favourites:['x'], liveries:[{id:'l'}] })]]);
  const storage = {
    getItem:k => db.has(k) ? db.get(k) : null,
    setItem:(k,v) => db.set(k,v),
    removeItem:k => db.delete(k)
  };
  const store = createRaceSetupStore(storage);
  const saved = store.save(setupFromBike(bike, 'persist', 'kona', CAT.products), CAT.products);
  const reloaded = createRaceSetupStore(storage).load(CAT.products);
  assert.equal(reloaded.slots.bike.product_id, saved.slots.bike.product_id);
  assert.equal(reloaded.slots.bike.configuration.look, 'persist');
  assert.match(db.get('speedmax.profile.v1'), /Ana/);
  assert.equal(RACE_SETUP_KEY, 'kona.raceSetup.v1');
});

test('legacy RaceSetup storage migrates through canonical storage authority',()=>{
  const old = JSON.stringify({ version:1, event:'kona-2026', bike:{ productId:bike.id, look:'legacy', scene:'kona' } });
  const db=new Map([['speedmax.raceSetup.v1',old]]);
  const storage={getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,v),removeItem:k=>db.delete(k)};
  const loaded=createRaceSetupStore(storage).load(CAT.products);
  assert.equal(loaded.slots.bike.product_id,bike.id);
  assert.equal(db.get('kona.raceSetup.v1'),old);
});

test('empty setup stays empty and share encoding is omitted', () => {
  const s = createRaceSetup();
  assert.equal(completedSlots(s), 0);
  assert.equal(encodeRaceSetup(s, CAT.products), '');
});
