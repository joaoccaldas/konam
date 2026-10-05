import assert from 'node:assert/strict';
import {handler} from './handler.ts';
const headers={apikey:'sb_publishable_lVueu3GqNcPe4Z9KsChvJw_VfmnVi5u',origin:'https://joaoccaldas.github.io'};
Deno.test('newsletter bounds bytes without trusting Content-Length or touching consent records',async()=>{
  for(const length of [null,'1']){
    const req=new Request('https://example.org',{method:'POST',headers:{...headers,...(length?{'content-length':length}:{})},body:JSON.stringify({ignored:'x'.repeat(2100)})});
    assert.equal((await handler(req)).status,400);
  }
});
Deno.test('newsletter denies non-browser origins and invalid JSON before service access',async()=>{
  assert.equal((await handler(new Request('https://example.org',{method:'POST',headers:{apikey:headers.apikey}}))).status,403);
  assert.equal((await handler(new Request('https://example.org',{method:'POST',headers,body:'[]'}))).status,400);
});
