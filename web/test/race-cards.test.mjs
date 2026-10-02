import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import { readRaceHistory, setRaceRelationship } from '../src/engine/race-history.js';
import { itemCollection } from '../src/engine/items.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../../integrations/ironman-races-2016-2026.json',import.meta.url),'utf8'));
const schema=JSON.parse(fs.readFileSync(new URL('../../schemas/race-card-v1.schema.json',import.meta.url),'utf8'));
const ui=fs.readFileSync(new URL('../src/ui/race-cards.js',import.meta.url),'utf8');

test('race catalog covers the requested decade at useful scale',()=>{
 assert.equal(catalog.schema,'kona-race-catalog-v1');assert.ok(catalog.races.length>=800);assert.ok(catalog.coverage.series_count>=120);
 assert.ok(catalog.races.every(r=>r.year>=2016&&r.year<=2026));assert.ok(catalog.races.some(r=>r.distance==='70.3'));assert.ok(catalog.races.some(r=>r.distance==='140.6'));
});
test('race card schema has stable identity and provenance fields',()=>{for(const k of ['id','series_id','name','year','distance','brand','status','source'])assert.ok(schema.required.includes(k));});
test('personal race state stores relationships, not copied race metadata',()=>{
 const m=new Map();const store={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};
 const id=catalog.races[0].id;setRaceRelationship(id,'completed',store);const rows=readRaceHistory(store);assert.equal(rows.length,1);assert.deepEqual(Object.keys(rows[0]).sort(),['race_id','relationship','result','selected_at'].sort());
 const items=itemCollection({race_history:rows});assert.ok(items.some(x=>x.kind==='race'&&x.entity_id===id));
});
test('one race-card renderer owns autocomplete and relationship actions',()=>{assert.match(ui,/data-race-search/);assert.match(ui,/Completed/);assert.match(ui,/Registered/);assert.match(ui,/Interested/);});
