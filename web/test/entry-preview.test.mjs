import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { entryCatalog } from '../../tools/lib/entry-catalog.mjs';
import { contentVisible } from '../src/engine/event-visibility.js';
import { chooseEntryPreview } from '../src/engine/entry-preview.js';
test('the full eligible bike catalog projects to public previews or anonymous silhouettes', () => {
  const products=JSON.parse(fs.readFileSync(new URL('../../museum/catalog/products.json',import.meta.url))).products;
  const built=JSON.parse(fs.readFileSync(new URL('../../museum/entry-catalog.json',import.meta.url))).bikes;
  assert.deepEqual(built,entryCatalog(products));
  assert.equal(built.length,products.filter(p=>p.type==='bike'&&p.public!==false&&contentVisible(p)).length);
  for(const bike of built){
    if(bike.secret)assert.deepEqual(Object.keys(bike),['id','secret']);
    else assert.ok(fs.statSync(new URL('../../'+bike.image,import.meta.url)).size>1000);
  }
});
test('secret and unpublished bikes never expose their identifying fields in the hero', () => {
  const rows=entryCatalog([
    {id:'hidden-prototype',type:'bike',name:'Confidential name',glb:'private.glb',where:[{id:'secret'}]},
    {id:'internal',type:'bike',public:false},
  ]);
  assert.deepEqual(rows,[{id:'mystery-1',secret:true}]);
  assert.doesNotMatch(JSON.stringify(rows),/hidden-prototype|Confidential|private|internal/);
});
test('return and next-bike selection never immediately repeat, and every eligible entry can be selected', () => {
  const bikes=[{id:'one'},{id:'two'},{id:'mystery',secret:true}];
  for(const previous of bikes){
    const selected=new Set();
    for(let i=0;i<100;i++){const bike=chooseEntryPreview(bikes,previous.id,()=>i/100);assert.notEqual(bike.id,previous.id);selected.add(bike.id);}
    assert.equal(selected.size,2);
  }
  assert.equal(chooseEntryPreview([],null),null);
  assert.equal(chooseEntryPreview([{id:'only'}],'only').id,'only');
});
