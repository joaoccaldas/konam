import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('../../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');

test('public privacy copy matches the analytics runtime',()=>{
  const privacy=read('privacy.html');
  const llms=read('llms.txt');
  const analytics=read('web/src/site-analytics.js');
  assert.match(privacy,/privacy-minimal first-party product analytics/i);
  assert.match(llms,/privacy-minimal first-party session analytics/i);
  assert.doesNotMatch(privacy,/no analytics|no tracking/i);
  assert.doesNotMatch(llms,/no analytics|no tracking/i);
  assert.match(analytics,/No cookies, account IDs, email/);
  assert.doesNotMatch(analytics,/profile|race_identity|free[-_ ]?text|innerText|textContent/i);
});

test('analytics only emits an explicit product-event allowlist from known controls',()=>{
  const analytics=read('web/src/site-analytics.js');
  for(const event of ['page_view','entry_continue','world_opened','garage_opened','discover_opened','plan_opened','me_opened','share_invoked','install_invoked','kona_now_feed_opened','kona_now_travel_opened']){
    assert.match(analytics,new RegExp(event));
  }
  assert.doesNotMatch(analytics,/pointermove|mousemove|keydown|input\s*=>|formdata/i);
});

test('Intern editorial has a source-grounded contract and public reply channel',()=>{
  const builder=read('tools/build_intern_dispatch.mjs');
  const notes=JSON.parse(read('integrations/companion/intern-notes.json'));
  const dispatch=JSON.parse(read('integrations/companion/intern-dispatch.json'));
  assert.match(builder,/Never summarize article facts/);
  assert.match(dispatch.source_policy,/original reporting|source feed/i);
  assert.ok(dispatch.watch.length>0);
  assert.ok(dispatch.watch.every(x=>/^https:\/\//.test(x.url)&&x.source&&x.published_at));
  assert.equal(dispatch.contact,'konamundo@gmail.com');
  assert.equal(notes.contact,'konamundo@gmail.com');
});

test('daily Intern workflow refreshes only public feed snapshots',()=>{
  const workflow=read('.github/workflows/intern-daily.yml');
  assert.match(workflow,/schedule:/);
  assert.match(workflow,/refresh_companion\.ts/);
  assert.match(workflow,/build_intern_dispatch\.mjs/);
  assert.match(workflow,/integrations\/companion\/intern-dispatch\.json/);
  assert.doesNotMatch(workflow,/git add -A|git add \./);
});

test('tone keeps the Intern candid without presenting incompetence as the product',()=>{
  const entry=read('web/src/entry.js');
  const returns=read('web/src/ui/return-journey.js');
  const promo=read('web/src/promo.js');
  for(const text of [entry,returns,promo]){
    assert.doesNotMatch(text,/learning to build a real app|arrow points somewhere stupid|intern probably shipped something late at night|install question getting annoying/i);
  }
});
