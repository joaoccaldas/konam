import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL('../../'+p,import.meta.url),'utf8');

test('direct viewer templates reference canonical GLB URLs instead of embedding base64 payloads',()=>{
  for(const p of ['web/index.template.html','web/heritage.template.html']){
    const html=read(p);
    assert.match(html,/__SPEEDMAX_GLB_URL/);
    assert.match(html,/__GLB_URL__/);
    assert.doesNotMatch(html,/__SPEEDMAX_GLB="/);
  }
});

test('direct viewer runtimes load GLBs by URL',()=>{
  for(const p of ['web/src/main.js','web/src/heritage.js']){
    const src=read(p);
    assert.match(src,/loader\.load\(window\.__SPEEDMAX_GLB_URL/);
    assert.doesNotMatch(src,/atob\(window\.__SPEEDMAX_GLB/);
  }
});

test('viewer builders do not base64 encode GLBs',()=>{
  for(const p of ['web/build.mjs','web/build_heritage.mjs']){
    const src=read(p);
    assert.doesNotMatch(src,/readFileSync\([^\n]*GLB[^\n]*toString\(['"]base64['"]\)/);
    assert.match(src,/__GLB_URL__/);
  }
});

test('web dist mirror rebases canonical asset URL',()=>{
  const src=read('tools/build_pages.mjs');
  assert.match(src,/__SPEEDMAX_GLB_URL/);
  assert.match(src,/path\.posix\.join\('\.\.\/\.\.'/);
});
