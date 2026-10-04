import test from 'node:test';
import assert from 'node:assert/strict';
import {assessCompanionHealth} from '../../tools/lib/companion-health.mjs';

const row=(kind,status='ok',age_hours=0.1,id=kind)=>({id,kind,status,age_hours});

test('athlete-video host outage degrades but does not fail healthy core news',()=>{
  const results=[
    row('news','ok',0.1,'n1'),row('news','ok',0.2,'n2'),row('kona','ok',0.2,'k1'),
    ...Array.from({length:6},(_,i)=>row('video','missing',null,'v'+i))
  ];
  const health=assessCompanionHealth(results);
  assert.equal(health.status,'WARN');
  assert.equal(health.core_fresh,3);
  assert.equal(health.video_fresh,0);
  assert.equal(health.failure_reasons.length,0);
});

test('missing Kona coverage remains a release incident',()=>{
  const health=assessCompanionHealth([
    row('news','ok',0.1,'n1'),row('news','ok',0.2,'n2'),row('kona','missing',null,'k1')
  ]);
  assert.equal(health.status,'FAIL');
  assert.match(health.failure_reasons.join(' '),/Kona|kona/);
});

test('missing triathlon news coverage remains a release incident',()=>{
  const health=assessCompanionHealth([
    row('news','missing',null,'n1'),row('news','missing',null,'n2'),row('kona','ok',0.1,'k1')
  ]);
  assert.equal(health.status,'FAIL');
  assert.match(health.failure_reasons.join(' '),/news/);
});
