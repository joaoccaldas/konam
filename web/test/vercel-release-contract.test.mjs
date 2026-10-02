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
