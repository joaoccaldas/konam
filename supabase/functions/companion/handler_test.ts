import {handler} from './handler.ts';import config from './public-config.json' with {type:'json'};import assert from 'node:assert/strict';
const req=(body:any,key=true)=>new Request('https://example.com/companion',{method:'POST',headers:key?{apikey:config.publishable_key,'Content-Type':'application/json'}:{},body:JSON.stringify(body)});
Deno.test('missing app key, invalid methods and oversized source lists are rejected',async()=>{
 assert.equal((await handler(req({sources:[]},false))).status,401);
 assert.equal((await handler(req({sources:[]}))).status,400);
 assert.equal((await handler(req({sources:Array(13).fill({url:'https://example.com/feed'})}))).status,400);
 assert.equal((await handler(new Request('https://example.com/companion',{method:'DELETE'}))).status,405);
 assert.equal((await handler(new Request('https://example.com/companion',{method:'OPTIONS'}))).status,204);
});
Deno.test('unsupported origins and local addresses are rejected before any network request',async()=>{
 const r=await handler(req({sources:[{url:'https://127.0.0.1/feed'},{url:'https://unreviewed.example.org/rss'}]}));const d=await r.json();assert.equal(d.items.length,0);assert.equal(d.errors.length,2);assert.match(d.errors[1].error,/not supported/);
});
