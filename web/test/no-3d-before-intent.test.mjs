import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const entry=fs.readFileSync(new URL('../src/entry.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../landing.template.html',import.meta.url),'utf8');

test('entry source does not statically import Three.js or hall runtime',()=>{
  assert.equal(/from ['"][^'"]*three/i.test(entry),false);
  assert.equal(/import\s+['"][^'"]*hall\.js/.test(entry),false);
});

test('hall runtime is loaded only by the explicit museum/world function',()=>{
  const idx=entry.indexOf("loadScript('app/hall.js')");
  assert.ok(idx>0,'hall.js lazy load must exist');
  const before=entry.slice(Math.max(0,idx-500),idx);
  assert.match(before,/openMuseum|enter.*world|museum/i);
});

test('landing HTML contains no GLB, HDR or Three.js preload',()=>{
  assert.equal(/\.glb\b|\.hdr\b|three(?:\.min)?\.js/i.test(html),false);
});

test('landing exposes the product door, sign-in and install affordances',()=>{
  assert.match(html,/id="buildSelf"/i);
  assert.match(html,/Enter KONA/i);
  assert.match(html,/Sign in/i);
  assert.match(html,/Install app/i);
});
