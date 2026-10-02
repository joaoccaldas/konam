// Safe, lightweight hero projection. Secret identities and asset paths never enter this file.
import fs from 'node:fs';
import path from 'node:path';
import { entryCatalog } from './lib/entry-catalog.mjs';
const root = path.resolve(import.meta.dirname, '..');
const products = JSON.parse(fs.readFileSync(path.join(root, 'museum/catalog/products.json'))).products;
const bikes = entryCatalog(products);
for (const bike of bikes) if (!bike.secret && !fs.existsSync(path.join(root, bike.image))) {
  throw new Error(`Missing entry preview for ${bike.id}; run tools/render_entry_art.mjs --catalog`);
}
fs.writeFileSync(path.join(root, 'museum/entry-catalog.json'), JSON.stringify({ schema_version: 1, bikes }, null, 1) + '\n');
console.log(`Entry catalog: ${bikes.length} bikes; ${bikes.filter(b => b.secret).length} anonymous silhouettes`);
