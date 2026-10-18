import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=path.resolve(import.meta.dirname,'../..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');

test('newsletter endpoint is production-origin scoped and never wildcard CORS',()=>{
  const fn=read('supabase/functions/newsletter-subscribe/handler.ts');
  assert.match(fn,/allowedOrigins=new Set\(\['https:\/\/joaoccaldas\.github\.io'\]\)/);
  assert.match(fn,/Origin not allowed/);
  assert.doesNotMatch(fn,/Access-Control-Allow-Origin':'\*'/);
});

test('explicit single-opt-in newsletter signup activates while suppression remains a hard stop',()=>{
  const fn=read('supabase/functions/newsletter-subscribe/handler.ts');
  assert.match(fn,/select\('status'\)/);
  assert.match(fn,/existing\.status==='pending'\|\|existing\.status==='unsubscribed'/);
  assert.match(fn,/status:'active'/);
  assert.match(fn,/suppression is always a hard stop/i);
  assert.doesNotMatch(fn,/\.upsert\(/);
});

test('newsletter table is denied to browser roles and least-privileged to service role',()=>{
  const sql=read('supabase/migrations/20261004054337_record_newsletter_boundary.sql');
  assert.match(sql,/enable row level security/i);
  assert.match(sql,/revoke all on table public\.newsletter_subscriptions from anon, authenticated, service_role/i);
  assert.match(sql,/grant select, insert, update, delete on table public\.newsletter_subscriptions to service_role/i);
  assert.match(sql,/newsletter_browser_deny_all/);
  assert.match(sql,/using \(false\)/i);
  assert.match(sql,/with check \(false\)/i);
});
