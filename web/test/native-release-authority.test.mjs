import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('../../',import.meta.url);
const read=path=>fs.readFileSync(new URL(path,root),'utf8');
const json=path=>JSON.parse(read(path));

test('native updater follows canonical product origin and never the legacy Canyon Museum origin',()=>{
  const meta=json('config/product-meta.json');
  const shell=read('web/src/app-shell.js');
  assert.equal(meta.canonical_site,'https://joaoccaldas.github.io/konam/');
  assert.match(shell,/PRODUCT_META\.canonical_site/);
  assert.doesNotMatch(shell,/joaoccaldas\.github\.io\/canyonmuseum\//);
});

test('Android public publishing stays fail-closed until the complete release identity exists',()=>{
  const workflow=read('.github/workflows/android.yml');
  for(const name of [
    'SPEEDMAX_KEYSTORE_BASE64',
    'SPEEDMAX_KEYSTORE_PASSWORD',
    'SPEEDMAX_KEY_ALIAS',
    'SPEEDMAX_KEY_PASSWORD'
  ]) assert.match(workflow,new RegExp(name));
  assert.match(workflow,/signed=false/);
  assert.match(workflow,/CN=Android Debug/);
  assert.match(workflow,/needs\.build\.outputs\.signed == 'true'/);
});
