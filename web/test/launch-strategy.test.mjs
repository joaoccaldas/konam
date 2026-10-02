import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL('../../'+p,import.meta.url),'utf8');
const json=p=>JSON.parse(read(p));

test('launch language contract matches locale registry',()=>{
  const launch=json('config/launch-language-v1.json');
  const locales=json('museum/i18n/locales.json');
  assert.deepEqual(launch.launch_locales,['en']);
  assert.equal(locales.default,'en');
  assert.equal(locales.locales.find(x=>x.id==='en')?.status,'launch');
  assert.equal(locales.locales.find(x=>x.id==='pt-BR')?.status,'next');
  assert.equal(locales.locales.find(x=>x.id==='pt-BR')?.route,null);
  assert.equal(locales.planned_public_routes,false);
});

test('business plan does not overclaim bilingual launch',()=>{
  const plan=read('docs/BUSINESS_PLAN.md');
  assert.match(plan,/English.*only language required for the initial public launch/is);
  assert.match(plan,/Brazilian Portuguese \(pt-BR\).*first expansion language/is);
  assert.doesNotMatch(plan,/English and Brazilian Portuguese are first-class launch languages/i);
});

test('launch plan separates commercial capability from partnership proof',()=>{
  const plan=read('docs/BUSINESS_PLAN.md');
  assert.match(plan,/Commercial capability is separated from commercial proof/);
  assert.match(plan,/not current partnerships unless an agreement exists/i);
  assert.match(plan,/No sponsor, partner, affiliate or official-status claim appears publicly before it is true/i);
});

test('launch plan keeps visual system stable rather than adding a new one',()=>{
  const plan=read('docs/BUSINESS_PLAN.md');
  assert.match(plan,/No new global visual language before launch/);
  assert.match(plan,/Instrument Serif/);
  assert.match(plan,/Manrope/);
  assert.match(plan,/negative space/i);
});

test('roadmap keeps framework, CSS and world rewrites out of launch scope',()=>{
  const roadmap=read('docs/ROADMAP.md');
  for(const phrase of ['framework migration','broad dependency upgrades','broad CSS redesign','full world rebuild'])
    assert.match(roadmap,new RegExp(phrase,'i'));
});
