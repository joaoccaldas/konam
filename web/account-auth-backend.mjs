// Real local GoTrue + SMTP catcher. Refuses any non-loopback backend.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {registerAccount,signInWithPassword,consumeAuthCallback,currentUser,requestPasswordReset,updatePassword,signOut} from './src/cloud/supabase-lite.js';
const env=Object.fromEntries(fs.readFileSync(process.argv[2],'utf8').split('\n').flatMap(line=>{const match=line.match(/^([A-Z_]+)="?(.*?)"?$/);return match?[[match[1],match[2]]]:[]}));
const api=env.API_URL,mail=env.INBUCKET_URL||env.MAILPIT_URL;
for(const endpoint of [api,mail])assert.ok(endpoint&&['127.0.0.1','localhost'].includes(new URL(endpoint).hostname),'Auth integration test requires a local disposable Supabase');
assert.ok(env.ANON_KEY);
const networkFetch=globalThis.fetch;
globalThis.fetch=(url,options={})=>{
 if(String(url).startsWith('https://mtvpnoqwjpoqaiocrklq.supabase.co/'))return networkFetch(String(url).replace('https://mtvpnoqwjpoqaiocrklq.supabase.co',api),{...options,headers:{...options.headers,apikey:env.ANON_KEY}});
 return networkFetch(url,options);
};
const store=new Map();globalThis.localStorage={getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value),removeItem:key=>store.delete(key)};
globalThis.location={hash:'',pathname:'/konam/index.html',search:''};globalThis.history={replaceState:()=>{globalThis.location.hash='';}};
const email='auth-ci-'+randomUUID()+'@example.test',password='Konam-ci-only-'+randomUUID();
async function emailCallback(type) {
 for(let attempt=0;attempt<60;attempt++){
  const summaries=await (await networkFetch(mail+'/api/v1/messages')).json();
  for(const summary of summaries.messages||[]){
   if(!summary.To?.some(to=>to.Address===email))continue;
   const message=await (await networkFetch(mail+'/api/v1/message/'+summary.ID)).json();
   for(const match of (message.HTML||'').matchAll(/href="([^"]+)"/g)){
    const link=new URL(match[1].replaceAll('&amp;','&'));if(link.origin!==new URL(api).origin||link.searchParams.get('type')!==type)continue;
    const result=await networkFetch(link,{redirect:'manual'});assert.equal(result.status,303);
    const callback=new URL(result.headers.get('location'));assert.equal(callback.origin,'https://joaoccaldas.github.io');assert.ok(callback.hash.includes('access_token='));
    globalThis.location.hash=callback.hash;assert.equal(consumeAuthCallback(),true);assert.equal(globalThis.location.hash,'');return;
   }
  }
  await new Promise(resolve=>setTimeout(resolve,250));
 }
 throw new Error('Local confirmation/recovery email was not received.');
}
assert.deepEqual(await registerAccount(email,password),{signedIn:false});assert.equal(store.size,0);
await assert.rejects(signInWithPassword(email,password),error=>error.code==='email_not_confirmed');
await emailCallback('signup');assert.ok((await currentUser()).id);await signOut();assert.equal(store.size,0);
await assert.rejects(signInWithPassword(email,'wrong-password'),error=>error.code==='invalid_credentials');
assert.equal((await signInWithPassword(email,password)).email,email);
const key='kona.supabase.session.v1',session=JSON.parse(store.get(key));store.set(key,JSON.stringify({...session,expires_at:1}));assert.equal((await currentUser()).email,email);assert.ok(JSON.parse(store.get(key)).expires_at>1);
await requestPasswordReset(email);await emailCallback('recovery');const newPassword='New-ci-password-'+randomUUID();await updatePassword(newPassword);await signOut();await assert.rejects(signInWithPassword(email,password));assert.equal((await signInWithPassword(email,newPassword)).email,email);await signOut();assert.equal(store.size,0);
console.log('Real GoTrue + Mailpit PASS: signup, email confirmation, rejected unconfirmed login, password login, refresh, recovery email, password update, old-password rejection, logout.');
