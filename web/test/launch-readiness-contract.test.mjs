import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = p => fs.readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const json = p => JSON.parse(read(p));

test('SEO contract keeps current origin until deliberate production cutover', () => {
  const seo = json('config/seo-llm-v1.json');
  const meta = json('config/product-meta.json');
  assert.equal(seo.current_origin, meta.site_origin);
  assert.equal(seo.status, 'origin-pending');
  assert.ok(read('robots.txt').includes(meta.site_origin));
  assert.ok(read('sitemap.xml').includes(meta.site_origin));
});

test('LLM public guides are factual public surfaces with current product identity', () => {
  for (const file of ['llms.txt', 'llms-full.txt']) {
    const text = read(file);
    assert.match(text, /Kona\.m/);
    assert.doesNotMatch(text, /sponsored by Canyon/i);
    assert.match(text, /independent/i);
  }
});

test('launch measurement contract forbids direct identity and fingerprint properties', () => {
  const cfg = json('config/launch-events-v1.json');
  for (const forbidden of ['email', 'name', 'precise_location', 'advertising_id', 'fingerprint'])
    assert.ok(cfg.forbidden_properties.includes(forbidden), forbidden);
  assert.ok(cfg.events.some(e => e.id === 'race_identity_completed'));
  assert.ok(cfg.events.some(e => e.id === 'runtime_error'));
  assert.ok(cfg.events.some(e => e.id === 'webgl_fallback'));
});

test('measurement is not allowed to become a launch-delaying advertising stack', () => {
  const cfg = json('config/launch-events-v1.json');
  assert.match(cfg.privacy_model, /first-party/i);
  assert.match(cfg.implementation_rule, /not allowed to delay launch/i);
  assert.match(cfg.implementation_rule, /third-party advertising analytics/i);
});

test('Antigravity review does not claim codebase or world production is complete', () => {
  const review = json('docs/launch/ANTIGRAVITY_REVIEW_20261002.json');
  assert.ok(review.disagree_or_qualify.some(x => x.claim === 'The codebase is clean.' && x.assessment === 'too strong'));
  assert.ok(review.disagree_or_qualify.some(x => /28-room world/.test(x.claim) && x.assessment === 'too strong'));
});
