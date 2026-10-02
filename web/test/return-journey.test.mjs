import test from 'node:test';
import assert from 'node:assert/strict';
import { nextReturnMoment, readReturnJourney, recordReturnMoment, registerVisit } from '../src/engine/return-journey.js';

function memory(seed={}){
  const m=new Map(Object.entries(seed));
  return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};
}

test('return journey counts once per browser session',()=>{
  const storage=memory(),session=memory();
  const a=registerVisit({storage,session});
  const b=registerVisit({storage,session});
  assert.equal(a.state.visits,1);
  assert.equal(b.state.visits,1);
  assert.equal(b.counted,false);
});

test('reward education arrives before install nudges',()=>{
  const storage=memory(),session=memory();
  let s=readReturnJourney(storage);s.visits=3;
  assert.equal(nextReturnMoment(s,{}),'rewards');
  s=recordReturnMoment(s,'rewards','shown',storage);
  s.visits=5;
  assert.equal(nextReturnMoment(s,{}),'install-teaser');
});

test('install reminders are sparse and respect permanent opt out',()=>{
  const storage=memory();
  let s=readReturnJourney(storage);
  s.visits=5;s.rewardsSeen=true;
  s=recordReturnMoment(s,'install-teaser','dismiss-install',storage);
  s.visits=7;assert.equal(nextReturnMoment(s,{}),null);
  s.visits=8;assert.equal(nextReturnMoment(s,{}),'install-reminder');
  s=recordReturnMoment(s,'install-reminder','dismiss-install',storage);
  s.visits=11;assert.equal(nextReturnMoment(s,{}),'annoyance-check');
  s=recordReturnMoment(s,'annoyance-check','opt-out-install',storage);
  s.visits=50;assert.equal(nextReturnMoment(s,{}),null);
});

test('installed and native users never receive install nudges',()=>{
  const s={schema:1,visits:8,rewardsSeen:true,installTeaserSeen:false};
  assert.equal(nextReturnMoment(s,{standalone:true}),null);
  assert.equal(nextReturnMoment(s,{native:true}),null);
});
