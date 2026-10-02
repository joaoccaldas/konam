import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ui=fs.readFileSync(new URL('../src/ui/admin-assets.js',import.meta.url),'utf8');
const studio=fs.readFileSync(new URL('../src/ui/avatar-home.js',import.meta.url),'utf8');
const shell=fs.readFileSync(new URL('../src/ui/kona-shell.js',import.meta.url),'utf8');
const auth=fs.readFileSync(new URL('../src/cloud/supabase-lite.js',import.meta.url),'utf8');
const build=fs.readFileSync(new URL('../../tools/build_admin_assets.mjs',import.meta.url),'utf8');

test('admin access is role-based and hidden from non-admin users',()=>{
  assert.match(auth,/app_metadata\?\.role === 'admin'/);
  assert.match(shell,/isAdminUser/);
  assert.match(studio,/isAdmin\?menuItem\('assets'/);
  assert.match(ui,/if\(!isAdminUser\(user\)\)/);
  assert.doesNotMatch(auth,/joaoccaldas@gmail\.com|@gmail\.com/);
});

test('Asset Library is generated from canonical products, rooms, art and world registries',()=>{
  for(const source of [
    'museum/catalog/products.json',
    'museum/world/rooms.json',
    'museum/world/brand_rooms.json',
    'museum/world/decorations.json',
    'museum/art/paintings.json',
    'museum/world/wings/index.json'
  ]) assert.ok(build.includes(source),source);
  assert.match(build,/type:'room'/);
  assert.match(build,/proceduralPalettes/);
});

test('every generated asset class has a visual preview path',()=>{
  assert.match(ui,/asset-thumb-3d/);
  assert.match(ui,/asset-thumb-generated/);
  assert.match(ui,/imageCount/);
  assert.match(ui,/modelCount/);
  assert.match(ui,/generatedCount/);
  assert.match(ui,/missing previews/);
});

test('admin library exposes useful filters without becoming public navigation',()=>{
  for(const marker of ['data-asset-q','data-asset-type','data-asset-brand','data-asset-year','data-asset-group']) assert.match(ui,new RegExp(marker));
  assert.match(studio,/Asset Library/);
});
