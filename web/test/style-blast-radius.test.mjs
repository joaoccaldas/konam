import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=rel=>fs.readFileSync(new URL('../../'+rel,import.meta.url),'utf8');
const contract=JSON.parse(read('config/style-ownership-v1.json'));

test('style ownership contract names every active launch stylesheet',()=>{
  for(const rel of Object.keys(contract.owners)){
    assert.ok(fs.existsSync(new URL('../'+rel.replace(/^web\//,''),import.meta.url)) || fs.existsSync(new URL('../../'+rel,import.meta.url)),rel+' is missing');
  }
});

test('world and consumer styles do not cross declared ownership boundaries',()=>{
  for(const [rel,selectors] of Object.entries(contract.forbidden_cross_ownership)){
    const css=read(rel);
    for(const selector of selectors) assert.ok(!css.includes(selector),rel+' must not own '+selector);
  }
});

test('launch CSS specificity debt cannot grow silently',()=>{
  for(const [rel,budget] of Object.entries(contract.important_budget)){
    if(rel==='rule')continue;
    const count=(read(rel).match(/!important/g)||[]).length;
    assert.ok(count<=budget,rel+' !important debt grew: '+count+' > '+budget);
  }
});

test('feature styling remains route-owned rather than returning to global system CSS',()=>{
  const system=read('web/styles/system.css');
  for(const selector of ['.garage-shell','.race-self-experience','.companion-hero','.admin-assets-grid'])
    assert.ok(!system.includes(selector),'system.css absorbed feature selector '+selector);
});
