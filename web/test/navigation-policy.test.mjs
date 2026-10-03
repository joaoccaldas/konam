import test from 'node:test';
import assert from 'node:assert/strict';
import {NAV_ORDER,navigationForState,navigationVisibility} from '../src/engine/navigation-policy.js';

const progression=(overrides={})=>({
  schema:'progression-v1',level:1,discoveries:[],seen:[],...overrides
});

test('fresh shell shows only Home while routes remain a separate concern',()=>{
  assert.deepEqual(navigationForState({}),['home']);
  assert.deepEqual(navigationVisibility({}),{home:true,discover:false,garage:false,plan:false,me:false});
});

test('Race Self reveals You without requiring world exploration',()=>{
  assert.deepEqual(navigationForState({race_identity:{goal:{label:'Finish'}}}),['home','me']);
});

test('equipment reveals Garage without pretending it is a world discovery',()=>{
  const state={user_equipment:[{product_id:'bike:cfr'}],progression_engine:progression({discoveries:['bike:cfr']})};
  assert.deepEqual(navigationForState(state),['home','garage']);
});

test('meaningful exploration reveals Discover',()=>{
  const byFind={progression_engine:progression({discoveries:['find:shore:lava']})};
  assert.deepEqual(navigationForState(byFind),['home','discover']);
  const byLevel={progression_engine:progression({level:5})};
  assert.deepEqual(navigationForState(byLevel),['home'],'XP alone must not expose Discover before a real exploration event');
});

test('race context reveals Plan',()=>{
  assert.deepEqual(navigationForState({race_history:[{id:'race-1'}]}),['home','plan']);
  assert.deepEqual(navigationForState({race_setup:{event_id:'race-1'}}),['home','plan']);
});

test('mature state reveals the canonical five in canonical order',()=>{
  const state={
    race_identity:{goal:'race'},
    user_equipment:[{id:'bike'}],
    race_history:[{id:'race'}],
    progression_engine:progression({level:3,discoveries:['find:shore:lava']})
  };
  assert.deepEqual(navigationForState(state),NAV_ORDER);
});

test('admin inspection can expose all destinations without mutating user progression',()=>{
  assert.deepEqual(navigationForState({}, {admin:true}),NAV_ORDER);
});
