import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=path.resolve(import.meta.dirname,'../..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const handler=read('supabase/functions/newsletter-subscribe/handler.ts');
const limits=read('supabase/functions/_shared/rate-limit.ts');

test('newsletter signup keeps an allowlisted web origin, not wildcard CORS',()=>{
  assert.match(handler,/allowedOrigins=new Set\(\['https:\/\/joaoccaldas\.github\.io'\]\)/);
  assert.match(handler,/Origin not allowed/);
  assert.doesNotMatch(handler,/Access-Control-Allow-Origin['"]?\s*:\s*['"]\*['"]/);
});

test('signup is active single-opt-in and never unsuppresses an address',()=>{
  assert.match(handler,/status:'active'/);
  assert.match(handler,/existing\.status==='pending'\|\|existing\.status==='unsubscribed'/);
  assert.match(handler,/\.in\('status',\['pending','unsubscribed'\]\)/);
  assert.match(handler,/if\(existing\)/);
  assert.match(handler,/return response\(origin,\{ok:true,status:'active'\},202\)/);
  assert.doesNotMatch(handler,/\.upsert\(/);
});

test('server validates origin, method, bounded bodies and unsubscribe token',()=>{
  assert.match(handler,/if\(req\.method!=='POST'\)/);
  assert.match(handler,/readBoundedText\(req,2000\)/);
  assert.match(handler,/readBoundedJSON\(req,2000\)/);
  assert.match(handler,/if\(!originAllowed\(origin\)\)/);
  assert.match(handler,/validToken\(input\.unsubscribe\)/);
  assert.match(handler,/req\.method==='GET'&&linkToken!==null/);
  assert.match(handler,/\.neq\('status','suppressed'\)/);
});

test('rate-limit cannot silently allow requests when service fails',()=>{
  assert.match(handler,/if\(quota!=='allowed'\)/);
  assert.match(handler,/quota==='limited'\?429:503/);
  assert.match(limits,/if\(!res\.ok\)return 'unavailable'/);
  assert.match(limits,/catch\{return 'unavailable'\}/);
});

test('newsletter browser table roles remain denied by reviewed SQL',()=>{
  const sql=read('supabase/migrations/20261004054337_record_newsletter_boundary.sql');
  assert.match(sql,/enable row level security/i);
  assert.match(sql,/revoke all on table public\.newsletter_subscriptions from anon, authenticated, service_role/i);
  assert.match(sql,/grant select, insert, update, delete on table public\.newsletter_subscriptions to service_role/i);
  assert.match(sql,/newsletter_browser_deny_all/);
  assert.match(sql,/using \(false\)/i);
  assert.match(sql,/with check \(false\)/i);
});

// These are non-executing source-contract regression tests, not simulated HTTP
// attack tests or proof of the deployed Edge Function. The local Supabase SQL
// replay and behavioral handler tests remain separate mandatory evidence gates.
