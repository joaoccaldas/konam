// The studio: the catalogue is generated, complete and deduplicated; looks survive a round trip through
// a link; hostile links are rejected; filtering is predictable; the studio holds more than the museum.
import {contentVisible} from '../src/engine/event-visibility.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodeLook, decodeLook, productsFor, SCENES } from '../src/studio/model.js';
import { skinProblems } from '../src/engine/skins.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const J = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
const CAT = J('museum/catalog/products.json'), FILMS = J('museum/themes/films.json').films;

test('catalogue: unique ids, every model on disk, every skin valid', () => {
  const ids = CAT.products.map(p => p.id); assert.equal(new Set(ids).size, ids.length);
  for (const p of CAT.products) {
    assert.ok(fs.existsSync(path.join(root, p.glb)), p.glb);
    for (const s of p.skins || []) assert.deepEqual(skinProblems(s), [], `${p.id} ${s.id}`);
    assert.ok(p.sources?.length, `${p.id} has sources`);
  }
});
test('the studio always holds more bikes than the museum', () => {
  assert.ok(CAT.products.length > CAT.products.filter(p => p.museum).length);
  assert.equal(CAT.studio_only, CAT.products.filter(p => !p.museum).length);
});
test('catalogue is generated from its sources (never edited by hand)', () => {
  assert.equal(CAT.generated_by, 'tools/build_catalog.mjs');
});
test('a look survives a link', () => {
  const p = CAT.products.find(x => x.skins?.length > 1);
  const back = decodeLook(encodeLook({ skin: p.skins[1], finish: 'matte', custom: { frame: '#123456', tape: '#abcdef' } }), p, FILMS);
  assert.equal(back.skin.id, p.skins[1].id); assert.equal(back.finish, 'matte'); assert.deepEqual(back.custom, { frame: '#123456', tape: '#abcdef' });
  const film = decodeLook(encodeLook({ theme: FILMS[0].id }), p, FILMS); assert.equal(film.theme, FILMS[0].id); assert.ok(film.skin.dye);
});
test('hostile or broken links are ignored', () => {
  const p = CAT.products[0];
  const evil = Buffer.from(JSON.stringify({ c: { frame: 'red;background:url(x)', '__proto__': '#000000', tape: '#00ff00' }, f: '<img>', t: 'nope' })).toString('base64url');
  const l = decodeLook(evil, p, FILMS);
  assert.deepEqual(l.custom, { tape: '#00ff00' }); assert.equal(l.finish, 'gloss');
  assert.equal(decodeLook('%%%', p, FILMS), null); assert.equal(decodeLook('x'.repeat(700), p, FILMS), null);
});
test('filters and events', () => {
  const ev = J('museum/events/kona-2026.json');
  for (const id of ev.featured) assert.ok(CAT.products.some(p => p.id === id), `featured ${id}`);
  for (const id of ev.themes) assert.ok(FILMS.some(f => f.id === id), `theme ${id}`);
  const list = productsFor(CAT.products, { event: ev }); assert.equal(list[0].id, ev.featured.find(id => list.some(p => p.id === id)));
  assert.ok(productsFor(CAT.products, { q: 'lotus' }).every(p => /lotus/i.test(p.name + p.brand)));
  assert.ok(Object.values(SCENES).every(s => s.sky.length === 2 && s.label));
});

test('rooms registry: every named product exists, every area has a name, every bike is somewhere or studio-only', () => {
  const rooms = J('museum/world/rooms.json');
  const ids = new Set(CAT.products.map(p => p.id));
  for (const a of rooms.areas) {
    assert.ok(a.name && a.sub && rooms.floors.some(f => f.id === a.floor), a.id);
    for (const p of a.exhibits?.products || []) assert.ok(ids.has(p), `${a.id}: ${p}`);
  }
  for (const p of CAT.products) assert.equal(p.museum, p.where.length > 0, p.id);
  assert.ok(CAT.products.filter(p => p.origin === 'museum-edition' && p.edition === 'film').length === J('museum/themes/films.json').films.filter(contentVisible).length, 'every enabled film bike is in the studio');
});
