import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=path.resolve(import.meta.dirname,'../..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');

test('site analytics is privacy-minimal and session-scoped',()=>{
  const src=read('web/src/site-analytics.js');
  assert.match(src,/sessionStorage/);
  assert.doesNotMatch(src,/localStorage/);
  assert.doesNotMatch(src,/document\.cookie|cookie=/);
  assert.doesNotMatch(src,/email|user_id|account_id|userAgent|navigator\.userAgent/);
  assert.match(src,/credentials:'omit'/);\n  assert.match(src,/'compact'.*'medium'.*'wide'/s);
});

test('site analytics only sends from the canonical public origin',()=>{
  const src=read('web/src/site-analytics.js');
  assert.match(src,/location\.hostname==='joaoccaldas\.github\.io'/);
  assert.match(src,/location\.pathname\.startsWith\('\/konam'\)/);
});

test('landing loads the standalone analytics module and staging publishes it',()=>{
  const landing=read('web/landing.template.html');
  const stage=read('tools/stage_site.sh');
  assert.match(landing,/web\/src\/site-analytics\.js/);
  assert.match(stage,/web\/src\/site-analytics\.js/);
  assert.match(stage,/test -f _site\/web\/src\/site-analytics\.js/);
});

test('analytics event vocabulary covers the race-week first-run funnel',()=>{
  const src=read('web/src/site-analytics.js');
  for(const event of ['page_view','entry_continue','world_opened','garage_opened','discover_opened','plan_opened','me_opened','share_invoked','install_invoked']){
    assert.match(src,new RegExp("'"+event+"'"));
  }
});

test('privacy notice discloses first-party analytics accurately',()=>{
  const privacy=read('privacy.html');
  assert.match(privacy,/privacy-minimal first-party product analytics/i);
  assert.match(privacy,/random ID limited to the current browser session/i);
  assert.match(privacy,/stores no IP address, user agent, email, account ID or persistent visitor identifier/i);
});
