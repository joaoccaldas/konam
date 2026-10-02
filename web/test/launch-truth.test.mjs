import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL('../../'+p,import.meta.url),'utf8');
const json=p=>JSON.parse(read(p));

test('Kona.m launch identity is coherent on primary public surfaces',()=>{
  const meta=json('config/product-meta.json');
  const manifest=json('manifest.webmanifest');
  const landing=read('web/landing.template.html');
  assert.equal(meta.product_name,'Kona.m');
  assert.equal(manifest.name,'Kona.m');
  assert.equal(manifest.short_name,'Kona.m');
  assert.match(landing,/<title>Kona\.m · Race the version of yourself<\/title>/);
  assert.match(landing,/Enter Kona\.m/);
  assert.match(landing,/Canyon Museum/);
  const native=json('app/native/capacitor.config.json');
  assert.equal(native.appName,'Kona.m');
  assert.equal(native.appId,'com.caldasstudio.speedmaxmuseum');
});

test('all 14 founding rooms remain launch-visible and progressive rooms remain distinct',()=>{
  const rooms=json('world/konam/rooms-v1.json').rooms;
  const founding=rooms.filter(r=>r.group==='foundation');
  const progressive=rooms.filter(r=>r.group==='progressive');
  assert.equal(founding.length,14);
  assert.equal(progressive.length,14);
  assert.ok(founding.every(r=>r.launch_visible===true));
  assert.ok(progressive.every(r=>r.launch_visible===false));
});

test('public launch surfaces do not publish unearned partnership or capability claims',()=>{
  const files=[
    'web/landing.template.html',
    'web/src/entry.js',
    'web/src/ui/kona-shell.js',
    'web/src/ui/home.js',
    'web/src/ui/discover.js',
    'web/src/ui/garage.js',
    'web/src/ui/me.js',
    'manifest.webmanifest'
  ];
  const prohibited=[
    /Nike Sponsored Room/i,
    /Lionel Sanders Sponsored Room/i,
    /official partnership/i,
    /cryptographic passport/i,
    /cryptographic guest seed/i,
    /sacred Hawaiian archetype/i,
    /Navier[- ]Stokes/i,
    /certified compatibility/i
  ];
  for(const file of files){
    const text=read(file);
    for(const re of prohibited)assert.doesNotMatch(text,re,`${file} contains launch claim ${re}`);
  }
});

test('launch build authority remains esbuild, not an unplanned framework migration',()=>{
  const pkg=json('web/package.json');
  assert.ok(pkg.dependencies?.esbuild,'esbuild must remain explicit build dependency during launch migration');
  assert.equal(pkg.dependencies?.vite,undefined);
  assert.equal(pkg.devDependencies?.vite,undefined);
});
