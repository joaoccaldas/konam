import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=rel=>fs.readFileSync(new URL('../../'+rel,import.meta.url),'utf8');
const tokens=read('brand/tokens.css');
const system=read('web/styles/system.css');
const shell=read('web/styles/shell-mobile.css');
const raceSelf=read('web/styles/race-self.css');
const hall=read('web/styles/hall-web.css');
const hallMobile=read('web/styles/hall-mobile.css');
const studioTpl=read('web/studio.template.html');
const studioCss=read('web/styles/studio.css');
const artifact=read('brand/artifacts.css');
const typography=read('brand/typography.css');

test('canonical component geometry lives in brand tokens',()=>{
  for(const token of ['--brand-card-radius','--brand-sheet-radius','--brand-touch','--brand-mobile-gutter','--brand-surface-glass-strong']) assert.match(tokens,new RegExp(token));
});
test('Studio no longer owns an inline design system',()=>{
  assert.doesNotMatch(studioTpl,/<style>/);
  assert.match(studioTpl,/brand\/tokens\.css/);
  assert.match(studioTpl,/web\/styles\/system\.css/);
  assert.match(studioTpl,/web\/styles\/studio\.css/);
  assert.match(studioCss,/--brand-touch/);
  assert.match(studioCss,/--brand-sheet-radius/);
});
test('mobile world cards are compact branded sheets',()=>{
  assert.match(hallMobile,/RC5 mobile world interaction grammar/);
  assert.match(hallMobile,/max-height:min\(42dvh,430px\)/);
  assert.match(hallMobile,/--brand-sheet-radius/);
  assert.match(hallMobile,/--brand-surface-glass-strong/);
  assert.match(hallMobile,/grid-template-columns:1fr/);
});
test('map and generic artifacts consume brand semantics',()=>{
  assert.match(hall,/RC5 map brand convergence/);
  assert.match(hall,/--brand-surface/);
  assert.match(hall,/--brand-accent-2/);
  assert.match(artifact,/artifact--hero/);
  assert.match(artifact,/--brand-surface/);
  assert.match(typography,/--brand-font-editorial/);
});
test('consumer and personal surfaces share touch and card rules',()=>{
  assert.match(system,/--brand-touch/);
  assert.match(system,/--brand-card-radius/);
  assert.match(raceSelf,/--brand-touch/);
  assert.match(raceSelf,/--brand-sheet-radius/);
  assert.doesNotMatch(shell,/\.race-self-experience|\.race-self-controls/);
});

test('active consumer templates do not own inline design systems',()=>{
  for(const rel of ['web/landing.template.html','web/studio.template.html','web/experience.template.html','web/collection.template.html']){
    const src=read(rel);
    assert.doesNotMatch(src,/<style>/,rel+' reintroduced inline CSS');
    assert.match(src,/brand\/tokens\.css/,rel+' is not brand-token aware');
  }
});
test('active secondary surfaces have dedicated external style authorities',()=>{
  for(const rel of ['web/styles/studio.css','web/styles/experience.css','web/styles/collection.css']){
    const src=read(rel);
    assert.match(src,/--brand-(?:bg|surface|ink|touch)/,rel+' does not consume brand semantics');
  }
});
