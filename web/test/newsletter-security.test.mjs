import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=path.resolve(import.meta.dirname,'../..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const handler=read('supabase/functions/newsletter-subscribe/handler.ts');
const limiter=read('supabase/functions/_shared/rate-limit.ts');

test('source signup is origin-scoped; CORS not wildcard',()=>{
  assert.match(handler,/allowedOrigins=new Set\(\['https:\/\/joaoccaldas\.github\.io'\]\)/);
  assert.match(handler,/Origin not allowed/);
  assert.doesNotMatch(handler,/Access-Control-Allow-Origin['"]?\s*:\s*['"]\*['"]/);
});

test('repository implementation: anonymous single-opt-in request stays pending',()=>{
  assert.match(handler,/if\(existing\)return response\(origin,\{ok:true,status:'pending'\},202\)/);
  assert.match(handler,/email,status:'pending'/);
  assert.doesNotMatch(handler,/\.upsert\(/);
});

test('repository implementation: anonymous request does not modify existing consent state',()=>{
  assert.match(handler,/if\(existing\)return response/);
  assert.match(handler,/\.insert\(\{/);
  assert.match(handler,/\.neq\('status','suppressed'\)/);
});

test('input limits and token-handling are explicit',()=>{
  assert.match(handler,/readBoundedText\(req,2000\)/);
  assert.match(handler,/readBoundedJSON\(req,2000\)/);
  assert.match(handler,/validToken\(input\.unsubscribe\)/);
  assert.match(handler,/req\.method==='GET'&&linkToken!==null/);
});

test('rate limiting fails closed when quota service fails',()=>{
  assert.match(handler,/if\(quota!=='allowed'\)/);
  assert.match(handler,/quota==='limited'\?429:503/);
  assert.match(limiter,/if\(!res\.ok\)return 'unavailable'/);
  assert.match(limiter,/catch\{return 'unavailable';\}/);
});

test('newsletter subscriptions have source-controlled browser-deny policy',()=>{
  const sql=read('supabase/migrations/20261004054337_record_newsletter_boundary.sql');
  assert.match(sql,/enable row level security/i);
  assert.match(sql,/revoke all on table public\.newsletter_subscriptions from anon, authenticated, service_role/i);
  assert.match(sql,/grant select, insert, update, delete on table public\.newsletter_subscriptions to service_role/i);
  assert.match(sql,/newsletter_browser_deny_all/);
  assert.match(sql,/using \(false\)/i);
  assert.match(sql,/with check \(false\)/i);
});

// Source contracts only. Live Supabase Edge Function v6 currently implements
// active single-opt-in, unlike source main's pending flow. DO NOT deploy this
// branch until owner decides the canonical consent flow and reconciles versions.
