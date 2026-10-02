import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = p => JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));

test('Kona.m world foundation is internally coherent', () => {
  const rooms = read('world/konam/rooms-v1.json').rooms;
  const collection = read('collections/kona-141-v1.json');
  const quests = read('quests/founding-v1.json').quests;
  const progression = read('world/konam/progression-v1.json').progressive;
  const reconciliation = read('collections/kona-141-reconciliation-v1.json').items;
  const roomReconciliation = read('world/konam/room-reconciliation-v1.json').rooms;
  const items = collection.items;

  assert.equal(rooms.length, 28);
  assert.equal(rooms.filter(r=>r.group==='foundation').length, 14);
  assert.equal(rooms.filter(r=>r.group==='progressive').length, 14);
  assert.equal(items.length, 141);
  assert.equal(items.filter(i=>i.room_id).length, 140);
  assert.equal(items.filter(i=>i.room_id==null).length, 1);
  assert.equal(reconciliation.length,141);
  assert.equal(new Set(reconciliation.map(r=>r.item_id)).size,141);
  assert.equal(roomReconciliation.length,28);
  assert.equal(new Set(roomReconciliation.map(r=>r.room_id)).size,28);
  assert.equal(items.find(i=>i.id==='k141-141')?.name, 'The Point Six');

  for (const r of rooms.filter(r=>r.group==='foundation')) {
    assert.equal(items.filter(i=>i.room_id===r.id).length, 10, r.id);
    assert.ok(quests.some(q=>q.room_id===r.id), `missing quest for ${r.id}`);
  }

  for (const i of items) assert.ok(reconciliation.some(r=>r.item_id===i.id), `missing reconciliation for ${i.id}`);
  for (const r of rooms) assert.ok(roomReconciliation.some(x=>x.room_id===r.id), `missing room reconciliation for ${r.id}`);

  const itemIds = new Set(items.map(i=>i.id));
  for (const q of quests) for (const id of q.reward_item_ids || []) assert.ok(itemIds.has(id), `${q.id} -> ${id}`);

  const anchors=collection.collection.anchor_item_ids;
  assert.equal(anchors.length,14);
  assert.equal(new Set(anchors).size,14);
  assert.ok(!anchors.includes('k141-141'));

  const progIds=new Set(progression.map(x=>x.room_id));
  for (const r of rooms.filter(r=>r.group==='progressive')) assert.ok(progIds.has(r.id), `missing progression for ${r.id}`);
});
