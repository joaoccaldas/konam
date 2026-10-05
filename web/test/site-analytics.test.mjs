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
    'kona_now_feed_opened','kona_now_travel_opened'
  ]) assert.ok(src.includes("'"+event+"'"),event);
  const feedback=read('web/src/ui/return-journey.js');
  for(const event of ['feedback_useful_yes','feedback_useful_no']) assert.ok(feedback.includes("'"+event+"'"),event);
  const fn=read('supabase/functions/site-analytics/index.ts');
  for(const event of ['first_bike_shown','feedback_useful_yes','feedback_useful_no']) assert.ok(fn.includes("'"+event+"'"),event);
});

test('privacy notice describes public-web analytics and native no-op',()=>{
  const privacy=read('privacy.html');
  assert.match(privacy,/privacy-minimal first-party product analytics/i);
  assert.match(privacy,/random ID limited to the current browser session/i);
  assert.match(privacy,/packaged native app does not enable this public-web analytics path/i);
  assert.match(privacy,/stores no IP address, user agent, email, account ID, precise location, full referrer URL, raw feedback text, raw error message, stack trace or persistent visitor identifier/i);
});


test('runtime telemetry is allowlisted, bounded and never sends raw exception content',()=>{
  const src=read('web/src/site-analytics.js');
  const fn=read('supabase/functions/site-analytics/index.ts');
  const migration=read('supabase/migrations/20261003114500_add_runtime_health_analytics.sql');

  assert.match(src,/trackRuntimeError/);
  assert.match(src,/runtimeTotal>=12/);
  assert.match(src,/count>=3/);
  assert.match(src,/filename\.origin!==location\.origin/);
  assert.match(src,/app\/app-manifest\.json/);
  assert.match(src,/release_id:releaseId/);
  assert.match(src,/online:navigator\.onLine/);

  for(const forbidden of [
    /event\.message/,/event\.error\.stack/,/reason\.stack/,/navigator\.userAgent/,
    /location\.search[^;]*body/,/location\.hash[^;]*body/
  ]) assert.doesNotMatch(src,forbidden);

  for(const code of ['uncaught_js','unhandled_promise','renderer_init','renderer_context_lost','route_load','state_read','state_write','companion_load']){
    assert.ok(src.includes("'"+code+"'"),'client allowlist '+code);
    assert.ok(fn.includes("'"+code+"'"),'server allowlist '+code);
  }
  assert.match(fn,/eventType==='runtime_error'/);
  assert.match(fn,/runtimeCodes\.has\(eventCode\)/);
  assert.match(fn,/runtimeSubsystems\.has\(subsystem\)/);
  assert.match(fn,/typeof online!=='boolean'/);
  assert.match(migration,/raw error message, stack trace/i);
  assert.match(migration,/release_id ~ '\^\[0-9a-f\]\{12\}\$'/);
});

test('runtime failure hooks report only coarse codes',()=>{
  const renderer=read('web/src/render/renderer.js');
  const entry=read('web/src/entry.js');
  const storage=read('web/src/engine/storage.js');
  const companion=read('web/src/ui/companion.js');

  assert.match(renderer,/renderer_init/);
  assert.match(renderer,/renderer_context_lost/);
  assert.match(renderer,/renderer_context_restored/);
  assert.match(entry,/route_load/);
  assert.match(storage,/state_read/);
  assert.match(storage,/state_write/);
  assert.match(companion,/companion_load/);

  for(const src of [renderer,entry,storage,companion]){
    assert.doesNotMatch(src,/trackRuntimeError\?\.\([^)]*(?:message|stack|email|token)/i);
  }
});


test('analytics v2 preserves first-touch acquisition and separates traffic quality',()=>{
  const src=read('web/src/site-analytics.js');
  const fn=read('supabase/functions/site-analytics/index.ts');
  const migration=read('supabase/migrations/20261003123000_analytics_v2_traffic_quality.sql');
  assert.match(src,/kona\.analytics\.acquisition\.v2/);
  assert.match(src,/analytics_mode/);
  assert.match(src,/navigator\.webdriver/);
  assert.match(src,/traffic_class:trafficClass/);
  assert.match(src,/landing_path:acquisition\.landing_path/);
  assert.match(src,/session_engaged_15s/);
  assert.match(fn,/trafficClasses=new Set\(\['public','qa','automation'\]\)/);
  assert.match(fn,/Invalid traffic class/);
  assert.match(fn,/Invalid landing path/);
  assert.match(migration,/traffic_class in \('public','qa','automation'\)/);
  assert.match(migration,/session_engaged_15s/);
  assert.doesNotMatch(src,/navigator\.userAgent|localStorage|document\.cookie/);
});

test('every hardened public page receives exactly one analytics module',()=>{
  const hardener=read('tools/harden_pages.mjs');
  assert.match(hardener,/ANALYTICS_SCRIPT/);
  assert.ok(hardener.includes('web/src/site-analytics.js'));
  assert.match(hardener,/analyticsCount>1/);
  assert.match(hardener,/analyticsViaStandalone/);
  assert.match(hardener,/if\(!analyticsViaStandalone&&!analyticsCount\)/);
  const standalone=read('web/src/standalone-access.js');
  assert.match(standalone,/import ['"]\.\/site-analytics\.js['"]/);
  assert.ok(hardener.includes("html.replace(/<\\/body>/i, ANALYTICS_SCRIPT+'\\n</body>')"));
});
