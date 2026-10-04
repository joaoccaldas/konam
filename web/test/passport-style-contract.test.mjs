import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=rel=>fs.readFileSync(new URL('../../'+rel,import.meta.url),'utf8');

test('Passport behavior owns no stylesheet authority',()=>{
  const js=read('web/src/passport.js');
  assert.doesNotMatch(js,/const CSS\s*=|createElement\(\s*['"]style['"]\s*\)|ppStyle/);
  const inline=[...js.matchAll(/style="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(inline.filter(x=>!x.startsWith('--pp-progress:')),[]);
  assert.ok(inline.some(x=>x.startsWith('--pp-progress:')),'runtime progress is allowed as a data custom property');
});

test('Passport CSS consumes canonical KONA semantics',()=>{
  const css=read('web/styles/passport.css');
  for(const token of ['--brand-surface','--brand-ink','--brand-muted','--brand-faint','--brand-discovery','--brand-personality','--brand-touch','--brand-font-ui','--brand-font-editorial','--brand-font-data'])assert.ok(css.includes('var('+token+')'),token);
  assert.doesNotMatch(css,/#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})\b/i);
  assert.match(css,/\.emo button\{[\s\S]*width:var\(--brand-touch\);height:var\(--brand-touch\)/);
});

test('Passport is staged and integrity sealed but not landing-critical',()=>{
  const template=read('web/experience.template.html'),stage=read('tools/stage_site.sh'),build=read('tools/build_app.mjs'),landing=read('web/landing.template.html');
  assert.match(template,/web\/styles\/passport\.css/);
  assert.match(stage,/web\/styles\/passport\.css/);
  assert.match(build,/['"]web\/styles\/passport\.css['"]/);
  assert.doesNotMatch(landing,/web\/styles\/passport\.css/);
});

test('JavaScript stylesheet exception is fully retired',()=>{
  const cfg=JSON.parse(read('config/style-governance.json'));
  assert.equal(cfg.limits.js_style_injectors,0);
  assert.deepEqual(cfg.allowed_js_style_injectors,[]);
  assert.ok(cfg.classes.canonical.includes('web/styles/passport.css'));
});
