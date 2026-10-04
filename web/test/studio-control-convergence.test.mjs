import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=rel=>fs.readFileSync(new URL('../../'+rel,import.meta.url),'utf8');

test('Studio-owned actions use canonical KONA controls',()=>{
  const js=read('web/src/studio/main.js');
  assert.match(js,/btn-primary studio-action/);
  assert.match(js,/btn-secondary studio-action/);
  assert.doesNotMatch(js,/class\s*:\s*['"]btn (?:primary|ghost|lava)/);
});

test('Studio CSS does not own a global button design system',()=>{
  const css=read('web/styles/studio.css');
  assert.doesNotMatch(css,/(?:^|\n)\.btn\{/);
  assert.doesNotMatch(css,/(?:^|\n)\.btn\.(?:primary|ghost|lava)\{/);
  assert.match(css,/\.studio-action\.btn-primary,\.studio-action\.btn-secondary/);
});

test('legacy shared-card buttons are quarantined to the Studio card region',()=>{
  const css=read('web/styles/studio.css');
  assert.match(css,/#card \.btn\{/);
  assert.match(css,/#card \.btn\.primary\{/);
  assert.match(css,/#card \.btn\.ghost\{/);
  const unscoped=css.split('\n').filter(line=>/\.btn\.(?:primary|ghost)/.test(line)&&!/#card \.btn\.(?:primary|ghost)/.test(line)&&!/studio-action/.test(line));
  assert.deepEqual(unscoped,[]);
});

test('built Studio receives canonical components without preloading consumer feature CSS',()=>{
  const html=read('Studio.html');
  assert.match(html,/href="web\/styles\/components\.css"/);
  assert.match(html,/href="web\/styles\/studio\.css"/);
  for(const feature of ['home.css','garage.css','race-self.css','companion.css'])assert.doesNotMatch(html,new RegExp('web/styles/'+feature.replace('.','\\.')));
});
