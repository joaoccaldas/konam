import test from 'node:test';
import assert from 'node:assert/strict';
import { migrateStorage, readStorage, storageKey, writeStorage } from '../src/engine/storage.js';

function mem(seed = {}) {
  const m = new Map(Object.entries(seed));
  return {
    getItem:k => m.has(k) ? m.get(k) : null,
    setItem:(k,v) => m.set(k,String(v)),
    removeItem:k => m.delete(k),
    dump:() => Object.fromEntries(m),
  };
}

test('canonical keys use kona namespace', () => {
  assert.equal(storageKey('raceIdentity'), 'kona.raceIdentity.v1');
  assert.equal(storageKey('progression'), 'kona.progression.v1');
});

test('legacy speedmax value migrates without loss', () => {
  const s = mem({ 'speedmax.raceIdentity.v1': '{"id":"x"}' });
  assert.equal(readStorage('raceIdentity', s), '{"id":"x"}');
  assert.equal(s.dump()['kona.raceIdentity.v1'], '{"id":"x"}');
});

test('canonical value wins over legacy', () => {
  const s = mem({ 'kona.profile.v1':'new', 'speedmax.profile.v1':'old' });
  assert.equal(readStorage('profile', s), 'new');
});

test('bulk migration is idempotent', () => {
  const s = mem({ 'speedmax.garage.v1':'[]' });
  assert.equal(migrateStorage(s).length, 1);
  assert.equal(migrateStorage(s).length, 0);
});

test('writes target only canonical namespace', () => {
  const s = mem();
  writeStorage('konaSelf', '{"ok":1}', s);
  assert.equal(s.dump()['kona.konaSelf.v1'], '{"ok":1}');
  assert.equal(s.dump()['speedmax.konaSelf.v1'], undefined);
});
