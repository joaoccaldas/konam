import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectHallProduct, resolveProduct } from '../src/engine/product.js';
import { validateBrandRoom } from '../src/engine/brandroom.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const rooms = read('museum/world/brand_rooms.json');
const candidates = read('integrations/candidate-products.json');
const admin = read('app/admin-assets.json');
const nike = rooms.rooms.find(room => room.id === 'nike-running');
const hall = nike.products.find(product => product.id === 'nike-alphafly-3-study');
const candidate = candidates.items.find(product => product.id === hall.id);
const shell = { id: 'lab', name: 'Lab', bounds: { x0: 0, x1: 4, z0: 0, z1: -6 }, theme: {} };

test('Nike hall projection deep-equals the authored room product', () => {
  assert.equal(candidate.brand, hall.brand);
  assert.equal(candidate.model, hall.model);
  assert.equal(candidate.type, hall.type);
  assert.equal(candidate.asset_path, hall.glb);
  assert.equal(candidate.source_records[0], hall.source);
  assert.ok(hall.glb.endsWith('.glb'));
  const record = {
    id: candidate.id,
    brand: candidate.brand,
    model: candidate.model,
    type: candidate.type,
    year: hall.year,
    asset_path: candidate.asset_path,
    representation: candidate.representation,
    source_records: candidate.source_records,
    stats: hall.stats,
    legal: hall.legal,
    buy: hall.buy,
    capabilities: candidate.capabilities,
  };
  const ref = {
    product_id: hall.id,
    station: hall.station,
    room_story: { sub: hall.sub, text: hall.text },
    capabilities: hall.capabilities,
    brand: 'Other',
    glb: 'assets/other.glb',
    legal: 'Affiliated',
    buy: 'https://example.invalid/buy',
  };
  assert.deepEqual(projectHallProduct(record, ref), hall);
  assert.equal(projectHallProduct({ ...record, id: 'other-shoe' }, ref), null);
  assert.equal(projectHallProduct(null, ref), null);
});

test('a brand room accepts a product reference only when the asset resolves', () => {
  const ref = {
    product_id: hall.id,
    station: hall.station,
    room_story: { sub: hall.sub, text: hall.text },
    capabilities: hall.capabilities,
  };
  assert.deepEqual(validateBrandRoom({ ...shell, products: [ref] }, [], { [hall.id]: hall.glb }), []);
  assert.ok(validateBrandRoom({ ...shell, products: [{ product_id: 'missing-shoe', station: hall.station }] }, [], {}).some(error => /unknown id/.test(error)));
  assert.ok(validateBrandRoom({ ...shell, products: [ref] }, [], { [hall.id]: 'shoe.obj' }).some(error => /\.glb/.test(error)));
  assert.deepEqual(validateBrandRoom(nike, rooms.rooms.filter(room => room.id !== nike.id)), []);
});

test('a blocked candidate stays hidden until a public brand room places it', () => {
  assert.ok(candidate.blockers.includes('prototype-not-cad-exact'));
  assert.equal(resolveProduct(hall.id, { candidates, brandrooms: { rooms: [] } }), null);
  const placed = resolveProduct(hall.id, { candidates, brandrooms: rooms });
  assert.equal(placed.asset, hall.glb);
  assert.equal(placed.readiness, 'room');
  assert.equal(placed.room, 'nike-running');
  const refOnly = resolveProduct(hall.id, {
    candidates,
    brandrooms: { rooms: [{ id: 'nike-running', products: [{ product_id: hall.id }] }] },
  });
  assert.equal(refOnly.asset, hall.glb);
  assert.equal(refOnly.readiness, 'room');
});

test('the admin Alphafly row keeps its id, glb, and room', () => {
  const row = admin.assets.find(asset => asset.id === hall.id);
  assert.equal(row.id, hall.id);
  assert.equal(row.glb, hall.glb);
  assert.deepEqual(row.locations.map(location => location.id), ['nike-running']);
});
