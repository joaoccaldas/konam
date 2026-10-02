import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const client=fs.readFileSync(new URL('../src/growth/newsletter.js',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../src/ui/newsletter.js',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../../supabase/migrations/20261002123841_newsletter_subscriptions.sql',import.meta.url),'utf8').toLowerCase();
const deny=fs.readFileSync(new URL('../../supabase/migrations/20261002124641_newsletter_browser_deny_policy.sql',import.meta.url),'utf8').toLowerCase();

test('newsletter client uses the dedicated edge function and public key only',()=>{
  assert.match(client,/newsletter-subscribe/);assert.match(client,/PUBLIC_SUPABASE_KEY/);assert.doesNotMatch(client,/service_role|secret/i);
});
test('newsletter UI is explicit opt-in and does not pretend sending is live',()=>{
  assert.match(ui,/Explicit opt-in only/);assert.match(ui,/unsubscribe path are live/);assert.match(ui,/type="email"/);assert.match(ui,/newsletter-honeypot/);
});
test('newsletter table is RLS protected and browser roles have no direct grants',()=>{
  assert.match(migration,/enable row level security/);assert.match(migration,/revoke all .* anon, authenticated/);assert.match(migration,/service_role/);assert.match(deny,/to anon, authenticated/);assert.match(deny,/using \(false\)/);
});
