import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('../../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');

test('direct viewer builds reference canonical GLBs instead of base64 embedding them',()=>{
  const modern=read('web/build.mjs'),heritage=read('web/build_heritage.mjs');
  assert.doesNotMatch(modern,/readFileSync\(glbPath\)\.toString\(['"]base64/);
  assert.doesNotMatch(heritage,/readFileSync\(process\.env\.GLB\)\.toString\(['"]base64/);
  assert.match(modern,/__GLB_URL__/);
  assert.match(heritage,/__GLB_URL__/);
});

test('direct viewer runtimes use GLTFLoader URL loading',()=>{
  for(const path of ['web/src/main.js','web/src/heritage.js']){
    const src=read(path);
    assert.match(src,/__SPEEDMAX_GLB_URL/);
    assert.match(src,/loader\.load\(GLB_URL/);
    assert.doesNotMatch(src,/window\.__SPEEDMAX_GLB\b|loader\.parse\([^\n]*SPEEDMAX/);
  }
});

test('service worker inventory includes GLBs as separately verified lazy assets',()=>{
  const build=read('tools/build_app.mjs');
  const sw=read('web/sw.template.js');
  assert.match(build,/glb\|jpe\?g\|png\|webp\|hdr\|json/);
  assert.match(sw,/fetchVerified/);
  assert.match(sw,/const ASSETS/);
});
