// The service worker must always answer with a Response, even offline and even when nothing is cached,
// and every page must fall back to its own copy (never another page's).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const base = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const src = fs.readFileSync(path.join(base, 'sw.js'), 'utf8');
const appManifest = JSON.parse(fs.readFileSync(path.join(base, 'app/app-manifest.json'), 'utf8'));
const signedAsset = Object.keys(appManifest.files).find(p => !appManifest.core.includes(p) && /\.(?:jpg|png|glb)$/i.test(p));

function worker({ cached = {} } = {}) {
  const handlers = {}, store = new Map(Object.entries(cached));
  const caches = { open: async () => ({ match: async r => store.get(r.url || r), put: async (r, v) => store.set(r.url || r, v), addAll: async () => {} }), match: async r => store.get(r.url || r), keys: async () => [] };
  class Resp { constructor(body, init = {}) { this.body = body; this.status = init.status ?? 200; this.ok = this.status < 400; } clone() { return this; } }
  const ctx = { self: { addEventListener: (t, f) => (handlers[t] = f), location: { origin: 'https://m.test' }, registration: { scope: 'https://m.test/' }, skipWaiting() {}, clients: { claim() {} } },
    caches, fetch: async () => { throw new TypeError('Failed to fetch'); }, Response: Resp, URL, Promise };
  vm.runInNewContext(src, ctx);
  return async (url, mode, destination) => {
    let out; handlers.fetch({ request: { url, method: 'GET', mode, destination }, respondWith: p => (out = p) });
    return out ? await out : undefined;
  };
}
test('offline asset with no cache still answers with a Response', async () => {
  assert.ok(signedAsset, 'release has a signed lazy asset');
  const r = await worker()('https://m.test/' + signedAsset, 'no-cors', 'image');
  assert.ok(r && typeof r.status === 'number'); assert.equal(r.status, 504);
});
test('offline page with no cache gets the offline page, not another page', async () => {
  const r = await worker({ cached: { 'https://m.test/index.html': 'MUSEUM' } })('https://m.test/Canyon_Collection.html', 'navigate', 'document');
  assert.notEqual(r, 'MUSEUM'); assert.equal(r.status, 503); assert.match(String(r.body), /can.?t be reached/);
});
test('offline page with its own cached copy gets that copy', async () => {
  const r = await worker({ cached: { 'https://m.test/Studio.html': 'STUDIO' } })('https://m.test/Studio.html', 'navigate', 'document');
  assert.equal(r, 'STUDIO');
});
