import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=path.resolve(import.meta.dirname,'../..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');

test('site analytics is session-scoped, web-only and contains no identity payload',()=>{
  const src=read('web/src/site-analytics.js');
  assert.match(src,/sessionStorage/);
  assert.match(src,/!globalThis\.__NATIVE/);
  assert.doesNotMatch(src,/localStorage/);
  assert.doesNotMatch(src,/document\.cookie|cookie=/);
  assert.doesNotMatch(src,/user_id|account_id|userAgent|navigator\.userAgent|latitude|longitude|free.?text/i);
  assert.match(src,/credentials:'omit'/);
  assert.match(src,/'compact'.*'medium'.*'wide'/s);
});

test('analytics only emits on the canonical public web origin',()=>{
  const src=read('web/src/site-analytics.js');
  assert.match(src,/location\.hostname==='joaoccaldas\.github\.io'/);
  assert.match(src,/location\.pathname\.startsWith\('\/konam'\)/);
});

test('race-week funnel includes bike, Kona Now and binary feedback without text answers',()=>{
  const src=read('web/src/site-analytics.js');
  for(const event of [
    'page_view','entry_continue','first_bike_collected','first_bike_skipped',
    'kona_now_feed_opened','kona_now_travel_opened','feedback_useful_yes','feedback_useful_no'
  ]) assert.ok(src.includes("'"+event+"'"),event);
  const fn=read('supabase/functions/site-analytics/index.ts');
  for(const event of ['first_bike_shown','feedback_useful_yes','feedback_useful_no']) assert.ok(fn.includes("'"+event+"'"),event);
});

test('privacy notice describes public-web analytics and native no-op',()=>{
  const privacy=read('privacy.html');
  assert.match(privacy,/privacy-minimal first-party product analytics/i);
  assert.match(privacy,/random ID limited to the current browser session/i);
  assert.match(privacy,/packaged native app does not enable this public-web analytics path/i);
  assert.match(privacy,/stores no IP address, user agent, email, account ID, precise location, raw feedback text or persistent visitor identifier/i);
});
