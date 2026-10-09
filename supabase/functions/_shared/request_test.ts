import assert from 'node:assert/strict';
import {readBoundedJSON,BodyTooLarge} from './request.ts';
import {rateLimit} from './rate-limit.ts';
for(const header of [null,'1','5000'])Deno.test('bounds actual body bytes: Content-Length '+header,async()=>{
  const req=new Request('https://example.org',{method:'POST',headers:header?{'content-length':header}:{},body:JSON.stringify({ignored:'x'.repeat(4096)})});
  await assert.rejects(()=>readBoundedJSON(req,3500),BodyTooLarge);
});
Deno.test('bounds UTF-8 bytes and rejects arrays or malformed JSON',async()=>{
  const req=(body:string)=>new Request('https://example.org',{method:'POST',body});
  await assert.rejects(()=>readBoundedJSON(req(JSON.stringify({x:'é'.repeat(2000)})),3500),BodyTooLarge);
  for(const body of ['[]','null','{'])await assert.rejects(()=>readBoundedJSON(req(body),3500));
  assert.deepEqual(await readBoundedJSON(req('{"ok":true}'),20),{ok:true});
});
Deno.test('quota keys rotate by window, never disclose IP, and require a boolean response',async()=>{
  const bodies:any[]=[];const req=new Request('https://example.org',{headers:{'x-forwarded-for':'192.0.2.10'}});
  const fetcher=(async(_url:any,init:any)=>{bodies.push(JSON.parse(init.body));return new Response('true');}) as typeof fetch;
  const opts={url:'https://example.org',key:'test-service-key',fetcher,now:3600000};
  assert.equal(await rateLimit(req,'companion',opts),'allowed');
  assert.equal(await rateLimit(req,'companion',opts),'allowed');
  assert.equal(await rateLimit(req,'companion',{...opts,now:3660000}),'allowed');
  assert.equal(bodies[0].p_key,bodies[1].p_key);assert.notEqual(bodies[0].p_key,bodies[2].p_key);
  assert.match(bodies[0].p_key,/^[0-9a-f]{64}$/);assert.ok(!JSON.stringify(bodies).includes('192.0.2.10'));
  for(const [body,outcome] of [['false','limited'],['null','unavailable']])assert.equal(await rateLimit(req,'companion',{...opts,fetcher:(async()=>new Response(body)) as typeof fetch}),outcome);
  assert.equal(await rateLimit(req,'companion',{...opts,fetcher:(async()=>{throw new Error('offline')}) as typeof fetch}),'unavailable');
});
