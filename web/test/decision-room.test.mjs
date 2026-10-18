import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('../../', import.meta.url);
const read = p => fs.readFileSync(new URL(p, root), 'utf8');
const json = p => JSON.parse(read(p));

test('Decision Room is a host review room with its semantic identity', () => {
  const landing = read('web/src/landing.js'), mod = read('web/src/decision-room.js');
  assert.match(landing, /get\('reviewRoom'\) === 'decision-room'/);
  assert.match(landing, /DECISION_REVIEW \? buildDecisionRoom\(reviewCtx\)/);
  assert.match(landing, /'room:konam:decision-room'/);
  assert.match(read('web/src/entry.js'), /get\('reviewRoom'\) === 'decision-room'\) openMuseum\('beast'\)/);
  assert.doesNotMatch(mod, /new\s+THREE\.(WebGLRenderer|PerspectiveCamera|SpotLight|PointLight)\s*\(/);   // host renderer; practical light is faked
  assert.doesNotMatch(mod, /localStorage/);
});

test('every figure is the portfolio finance model, recomputed', () => {
  const d = json('pitch/decision-room/finance-example-v1.json'), B = d.base_plan;
  assert.deepEqual(B, { units: 1000, price: 100, cost: 60, fixed: 25000 });
  const want = { plan: [1000, 100, 60, 15000], volume: [1200, 100, 60, 23000], price: [1000, 95, 60, 10000], cost: [1000, 100, 66, 9000] };
  for (const s of d.scenarios) {
    const [u, p, c, profit] = want[s.id];
    assert.equal(s.units, u); assert.equal(s.price, p); assert.equal(s.cost, c);
    assert.equal(s.revenue, u * p); assert.equal(s.expenses, u * c + B.fixed); assert.equal(s.profit, profit);
    assert.equal(s.profit - 15000, s.volumeEffect + s.priceEffect + s.costEffect, `${s.id} bridge adds up`);
  }
  assert.equal(d.scenarios.find(s => s.id === 'plan').revenue, 100000);
  assert.equal(d.scenarios.find(s => s.id === 'plan').expenses, 85000);
  const rules = Object.fromEntries(d.alerts.rules.map(r => [r.id, r]));
  assert.equal(rules.margin.threshold, 25); assert.equal(rules.burn.threshold, 150000); assert.equal(rules.receivables.threshold, 40);
  assert.deepEqual(d.alerts.example_inputs, { margin: 30, burn: 145000, receivables: 34 });
  const breach = (r, v) => r.breach === 'below' ? v < r.threshold : v > r.threshold;
  for (const r of d.alerts.rules) { assert.equal(breach(r, d.alerts.example_inputs[r.id]), false, `${r.id} green with the example`); assert.equal(breach(r, d.alerts.stress_examples[r.id]), true, `${r.id} red when stressed`); }
});

test('the first card says the figures are invented', () => {
  assert.match(read('web/src/decision-room.js'), /Every figure in this room is invented example data/);
});

test('shared-library assets came through intake with provenance and validation', () => {
  const m = json('world/konam/candidates/decision-room-asset-manifest-v1.json');
  for (const a of m.assets.filter(a => a.runtime_ref)) {
    assert.ok(fs.existsSync(new URL(a.runtime_ref, root)), a.runtime_ref);
    assert.ok(fs.statSync(new URL(a.runtime_ref, root)).size < 400000, `${a.asset_id} stays light`);
    assert.match(a.source_ref, /gaudi-nexus-visual@e8a89d7/); assert.match(a.validation, /0 errors, 0 warnings/);
  }
});
