import test from 'node:test';
import assert from 'node:assert/strict';
import { createInterval, bandAt, INTERVAL_BANDS, REWARD_SECONDS } from '../src/beast-interval.js';
import { planRoute } from '../src/engine/route.js';

test('interval bands cover the minute and step up', () => {
  assert.equal(INTERVAL_BANDS[0].from, 0); assert.equal(INTERVAL_BANDS.at(-1).to, 60);
  for (let i = 1; i < INTERVAL_BANDS.length; i++) assert.equal(INTERVAL_BANDS[i].from, INTERVAL_BANDS[i - 1].to);
  assert.equal(bandAt(59.9).label, 'Empty it');
});

test('a steady rider earns the reward, an idle one does not', () => {
  const good = createInterval(), idle = createInterval();
  for (let i = 0; i < 1300; i++) { const b = good.band(); good.step(.05, good.state.power < (b.lo + b.hi) / 2); idle.step(.05, false); }
  assert.equal(good.state.done, true); assert.ok(good.result().inBand >= REWARD_SECONDS); assert.equal(good.result().rewarded, true);
  assert.equal(idle.result().inBand, 0); assert.equal(idle.result().rewarded, false);
});

test('routes use the east door for east rooms and walk through linked rooms', () => {
  const doors = { beast: -8, champ: -17 }, east = new Set(['beast']);
  const toBeast = planRoute({ x: 0, z: 0, to: { x: 25, z: -11 }, fromRoom: 'hall', toRoom: 'beast', doors, east });
  assert.ok(toBeast.some(p => p.x === 9.2 && p.z === -8)); assert.ok(!toBeast.some(p => p.x < -1.3));
  const toChamp = planRoute({ x: 0, z: 0, to: { x: -12, z: -17 }, fromRoom: 'hall', toRoom: 'champ', doors, east });
  assert.ok(toChamp.some(p => p.x === -9.2));
  const links = { breitling: { via: 'beast', pts: [{ x: 30.5, z: -16.6 }, { x: 30.5, z: -19 }] } };
  const toBrand = planRoute({ x: 0, z: 0, to: { x: 30.5, z: -22 }, fromRoom: 'hall', toRoom: 'breitling', doors, east, links });
  assert.deepEqual(toBrand.slice(-3), [{ x: 30.5, z: -16.6 }, { x: 30.5, z: -19 }, { x: 30.5, z: -22 }]);
  assert.ok(toBrand.some(p => p.x === 9.2 && p.z === -8));
  const back = planRoute({ x: 30.5, z: -22, to: { x: 0, z: -2 }, fromRoom: 'breitling', toRoom: 'hall', doors, east, links });
  assert.deepEqual(back.slice(0, 2), [{ x: 30.5, z: -19 }, { x: 30.5, z: -16.6 }]);
  assert.ok(back.some(p => p.x === 5.4 && p.z === -8));
});
