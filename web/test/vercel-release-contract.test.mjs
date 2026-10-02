import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const config=JSON.parse(fs.readFileSync(new URL('../../vercel.json',import.meta.url),'utf8'));

test('Vercel release keeps service worker and entry documents revalidating',()=>{
  assert.equal(config.$schema,'https://openapi.vercel.sh/vercel.json');
  const bySource=new Map((config.headers||[]).map(rule=>[rule.source,rule.headers||[]]));
  for(const source of ['/sw.js','/index.html','/manifest.webmanifest']){
    assert.ok(bySource.has(source),source+' header rule missing');
    const cache=bySource.get(source).find(h=>h.key.toLowerCase()==='cache-control');
    assert.match(cache?.value||'',/max-age=0/);
    assert.match(cache?.value||'',/must-revalidate/);
  }
  const swAllowed=bySource.get('/sw.js').find(h=>h.key.toLowerCase()==='service-worker-allowed');
  assert.equal(swAllowed?.value,'/');
});

test('Vercel config does not introduce catch-all routing that can shadow static assets',()=>{
  assert.equal(Array.isArray(config.routes),false);
  assert.equal(Array.isArray(config.rewrites),false);
});

test('Vercel publishes only the staged allowlist',()=>{
  assert.equal(config.installCommand,'cd web && npm ci --ignore-scripts');
  assert.equal(config.buildCommand,'node tools/build_pages.mjs && bash tools/stage_site.sh');
  assert.equal(config.outputDirectory,'_site');
});

test('About page runtime is present in the staged public bundle',()=>{
  const stage=fs.readFileSync(new URL('../../tools/stage_site.sh',import.meta.url),'utf8');
  assert.match(stage,/web\/styles\/about\.css/);
  assert.match(stage,/web\/src\/about-story\.js/);
  assert.match(stage,/test -f _site\/web\/src\/about-story\.js/);
  assert.match(stage,/test -f _site\/web\/styles\/about\.css/);
});
