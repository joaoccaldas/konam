import test from 'node:test';
import assert from 'node:assert/strict';
import {sendMagicLink,currentUser,consumeAuthCallback} from '../src/cloud/supabase-lite.js';
import {exportAppState} from '../src/engine/app-state.js';
const makeStore=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k),key:i=>[...data.keys()][i],get length(){return data.size}}};
function context(t){
 const old={localStorage:globalThis.localStorage,location:globalThis.location,history:globalThis.history,fetch:globalThis.fetch};
 globalThis.localStorage=makeStore();globalThis.location={href:'https://example.com/kona/Studio.html',hash:'',pathname:'/kona/Studio.html',search:''};
 t.after(()=>Object.assign(globalThis,old));return globalThis.localStorage;
}
test('email link returns to canonical index and repeated taps do not send another email',async t=>{
 const store=context(t);let calls=0;
 globalThis.fetch=async(url,opts)=>{calls++;assert.equal(new URL(url).searchParams.get('redirect_to'),'https://example.com/kona/index.html');assert.equal(JSON.parse(opts.body).create_user,true);assert.equal(JSON.parse(opts.body).email_redirect_to,undefined);return new Response('{}');};
 await sendMagicLink('athlete@example.com');await assert.rejects(sendMagicLink('athlete@example.com'),e=>e.code==='rate_limited');assert.equal(calls,1);
 assert.ok(!exportAppState(store).includes('athlete@example.com'),'cooldown stores no email');
});
test('rate-limited email does not falsely claim a link was sent',async t=>{
 context(t);globalThis.fetch=async()=>new Response('{}',{status:429,headers:{'retry-after':'120'}});
 await assert.rejects(sendMagicLink('athlete@example.com'),e=>e.retryAfter===120&&/temporarily limited/.test(e.message)&&!/just sent/.test(e.message));
});
test('offline user lookup preserves session while rejected credentials clear it',async t=>{
 const store=context(t);const key='kona.supabase.session.v1';store.setItem(key,JSON.stringify({access_token:'test-only',expires_at:Date.now()/1000+3600}));
 globalThis.fetch=async()=>{throw new TypeError('offline')};assert.equal(await currentUser(),null);assert.ok(store.getItem(key));
 assert.ok(!exportAppState(store).includes('test-only'),'exports must omit credentials');
 globalThis.fetch=async()=>new Response('{}',{status:401});assert.equal(await currentUser(),null);assert.equal(store.getItem(key),null);
});
test('concurrent user lookups share one refresh request',async t=>{
 const store=context(t);store.setItem('kona.supabase.session.v1',JSON.stringify({access_token:'expired-test',refresh_token:'refresh-test',expires_at:1}));let refreshes=0;
 globalThis.fetch=async url=>{if(url.includes('/token?')){refreshes++;await new Promise(r=>setTimeout(r,5));return new Response(JSON.stringify({access_token:'new-test',refresh_token:'refresh-test',expires_at:Date.now()/1000+3600}));}return new Response('{"id":"test-user"}');};
 const users=await Promise.all([currentUser(),currentUser()]);assert.equal(refreshes,1);assert.ok(users.every(u=>u.id==='test-user'));
});
test('auth callback removes credentials from the address bar',t=>{
 const store=context(t);globalThis.location.hash='#access_token=test-only&refresh_token=test-refresh&expires_in=3600';let replaced;
 globalThis.history={replaceState:(_,__,url)=>{replaced=url}};assert.equal(consumeAuthCallback(),true);assert.equal(replaced,'/kona/Studio.html');assert.ok(store.getItem('kona.supabase.session.v1'));
});
