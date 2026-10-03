import test from 'node:test';
import assert from 'node:assert/strict';
import {NAV_ORDER,navigationForState,navigationVisibility} from '../src/engine/navigation-policy.js';

test('primary navigation is stable for a fresh visitor',()=>{
  assert.deepEqual(navigationForState({}),NAV_ORDER);
  assert.deepEqual(navigationVisibility({}),{home:true,discover:true,garage:true,plan:true,me:true});
});

test('state and admin status never change the durable navigation map',()=>{
  const states=[
    {},
    {race_identity:{goal:{label:'Finish'}}},
    {user_equipment:[{product_id:'bike:cfr'}]},
    {race_history:[{id:'race-1'}]},
    {progression_engine:{schema:'progression-v1',level:5,discoveries:['find:shore:lava'],seen:[]}},
  ];
  for(const state of states){
    assert.deepEqual(navigationForState(state),NAV_ORDER);
    assert.deepEqual(navigationForState(state,{admin:true}),NAV_ORDER);
  }
});
