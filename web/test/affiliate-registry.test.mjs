import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const x=JSON.parse(fs.readFileSync(new URL('../../museum/commerce/affiliate-programs-v1.json',import.meta.url),'utf8'));
test('affiliate ranking is independent of commission',()=>assert.equal(x.policy.ranking_independent_of_commission,true));
test('clicks never earn user progression',()=>assert.equal(x.policy.reward_user_for_click,false));
test('unapproved programs cannot masquerade as live',()=>{for(const p of x.programs)assert.match(p.status,/not-applied|approved|rejected|pending/);});
test('every commercial claim has a source',()=>{for(const p of x.programs)assert.match(p.source,/^https:\/\//);});
