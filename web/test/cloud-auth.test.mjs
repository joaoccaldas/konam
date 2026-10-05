import test from 'node:test';
import assert from 'node:assert/strict';
import {sendMagicLink,currentUser,consumeAuthCallback,deleteCloudBackup} from '../src/cloud/supabase-lite.js';
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

test('cloud backup deletion uses the server-validated user and keeps device progress',async t=>{
 const store=context(t);store.setItem('kona.supabase.session.v1',JSON.stringify({access_token:'test-only',expires_at:Date.now()/1000+3600}));store.setItem('kona.profile.v1','{"name":"Local"}');let deletes=0;
 globalThis.fetch=async(url,options)=>{if(url.endsWith('/auth/v1/user'))return new Response('{"id":"validated-owner"}');assert.equal(options.method,'DELETE');assert.equal(new URL(url).searchParams.get('user_id'),'eq.validated-owner');assert.equal(options.headers.Authorization,'Bearer test-only');deletes++;return new Response(null,{status:204});};
 await deleteCloudBackup();assert.equal(deletes,1);assert.equal(store.getItem('kona.profile.v1'),' {"name":"Local"}'.trim());
});
test('cloud backup deletion refuses an unauthenticated caller',async t=>{context(t);globalThis.fetch=async()=>{throw new Error('must not call network')};await assert.rejects(deleteCloudBackup(),/Sign in first/);});

test('password sign-in saves an expiring session but never a plaintext password',async t=>{
 const store=context(t);const {signInWithPassword}=await import('../src/cloud/supabase-lite.js');
 globalThis.fetch=async(url,options)=>{assert.match(url,/grant_type=password/);assert.deepEqual(JSON.parse(options.body),{email:'athlete@example.com',password:'test-passphrase-only'});return new Response(JSON.stringify({access_token:'test-only',refresh_token:'test-refresh',expires_in:3600,user:{id:'athlete'}}));};
 assert.equal((await signInWithPassword(' Athlete@example.com ','test-passphrase-only')).id,'athlete');
 const session=JSON.parse(store.getItem('kona.supabase.session.v1'));assert.ok(session.expires_at>Date.now()/1000);assert.ok(!JSON.stringify(session).includes('test-passphrase-only'));assert.ok(!exportAppState(store).includes('test-refresh'));
});
test('rejected password sign-in and incomplete sessions do not claim success',async t=>{
 const store=context(t);const {signInWithPassword}=await import('../src/cloud/supabase-lite.js');
 globalThis.fetch=async()=>new Response('{"error_code":"invalid_credentials","msg":"Invalid login credentials"}',{status:400});await assert.rejects(signInWithPassword('athlete@example.com','incorrect'),e=>e.code==='invalid_credentials');assert.equal(store.getItem('kona.supabase.session.v1'),null);
 globalThis.fetch=async()=>new Response('{"access_token":"incomplete"}');await assert.rejects(signInWithPassword('athlete@example.com','incorrect'),/incomplete session/);assert.equal(store.getItem('kona.supabase.session.v1'),null);
});
test('confirmation-enabled registration stays signed out and uses the hosted callback from native',async t=>{
 const store=context(t);const {registerAccount,requestPasswordReset,resendConfirmation}=await import('../src/cloud/supabase-lite.js');globalThis.location.href='https://localhost/index.html';
 globalThis.fetch=async(url,options)=>{assert.equal(new URL(url).searchParams.get('redirect_to'),'https://joaoccaldas.github.io/konam/index.html');assert.equal(JSON.parse(options.body).email,'athlete@example.com');return new Response(url.includes('/signup')?'{"id":"pending-test-user"}':'{}');};
 assert.deepEqual(await registerAccount('athlete@example.com','memorable-test-words'),{signedIn:false});assert.equal(store.getItem('kona.supabase.session.v1'),null);await requestPasswordReset('athlete@example.com');await resendConfirmation('athlete@example.com');
 await assert.rejects(registerAccount('athlete@example.com','short'),/12 characters/);
});
test('recovery updates require authentication and keep backend failures visible',async t=>{
 const store=context(t);const {updatePassword,requestPasswordReset}=await import('../src/cloud/supabase-lite.js');await assert.rejects(updatePassword('new-test-passphrase'),/Sign in first/);
 store.setItem('kona.supabase.session.v1',JSON.stringify({access_token:'test-only',expires_at:Date.now()/1000+3600}));
 globalThis.fetch=async(url,options)=>{assert.match(url,/\/auth\/v1\/user$/);assert.equal(options.method,'PUT');assert.equal(options.headers.Authorization,'Bearer test-only');return new Response('{"id":"test-user"}');};assert.equal((await updatePassword('new-test-passphrase')).id,'test-user');
 globalThis.fetch=async()=>new Response('{"msg":"Email delivery failed"}',{status:500});await assert.rejects(requestPasswordReset('athlete@example.com'),/Email delivery failed/);
});
test('storage failure strips callback tokens and is reported to the visitor',t=>{
 context(t);globalThis.localStorage.setItem=()=>{throw new Error('blocked')};globalThis.location.hash='#access_token=test-only&refresh_token=test-refresh';let replaced;globalThis.history={replaceState:(_,__,url)=>replaced=url};assert.throws(consumeAuthCallback,/could not save/);assert.equal(replaced,'/kona/Studio.html');
});
