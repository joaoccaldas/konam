import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {artifactPrimaryAction,artifactViewModel} from '../src/ui/artifact-model.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../../museum/catalog/products.json',import.meta.url),'utf8'));
const products=catalog.products||catalog;
test('every canonical product can become an Artifact view model',()=>{for(const p of products){const vm=artifactViewModel(p);assert.equal(vm.id,p.id);assert.ok(vm.title);assert.ok(vm.tabs.includes('engineering'));}});
test('3D products lead with Inspect rather than commerce',()=>{const p=products.find(x=>x.glb);assert.equal(artifactPrimaryAction(artifactViewModel(p)).id,'inspect');});
test('commerce is not part of presentation ranking',()=>{const vm=artifactViewModel(products[0]);assert.equal('affiliate' in vm,false);assert.equal('commission' in vm,false);});
test('artifact requires stable identity',()=>assert.throws(()=>artifactViewModel({name:'Loose thing'})));
