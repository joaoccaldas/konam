import assert from 'node:assert/strict';
import {handler} from './handler.ts';
const key='sb_publishable_lVueu3GqNcPe4Z9KsChvJw_VfmnVi5u';
Deno.test('analytics rejects oversized streamed bodies before attempting service access',async()=>{
  for(const contentLength of [null,'1']){
    const req=new Request('https://example.org',{method:'POST',headers:{apikey:key,...(contentLength?{'content-length':contentLength}:{})},body:JSON.stringify({ignored:'x'.repeat(4000)})});
    assert.equal((await handler(req)).status,400);
  }
});
Deno.test('analytics rejects bad keys, foreign origins and scalar JSON',async()=>{
  assert.equal((await handler(new Request('https://example.org',{method:'POST'}))).status,401);
  assert.equal((await handler(new Request('https://example.org',{method:'POST',headers:{apikey:key,origin:'https://evil.example'}}))).status,403);
  assert.equal((await handler(new Request('https://example.org',{method:'POST',headers:{apikey:key},body:'null'}))).status,400);
});
