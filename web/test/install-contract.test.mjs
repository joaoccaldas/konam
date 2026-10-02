import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const manifest=JSON.parse(fs.readFileSync(new URL('../../manifest.webmanifest',import.meta.url),'utf8'));
const android=JSON.parse(fs.readFileSync(new URL('../../app/android-version.json',import.meta.url),'utf8'));
const androidWorkflow=fs.readFileSync(new URL('../../.github/workflows/android.yml',import.meta.url),'utf8');

test('installed PWA uses current KONA identity',()=>{assert.equal(manifest.name,'KONA');assert.equal(manifest.short_name,'KONA');});
test('PWA starts inside current app scope',()=>{assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');assert.equal(manifest.display,'standalone');});
test('native APK metadata is safe whether unpublished or signed and public',()=>{
  assert.ok(Number.isInteger(android.versionCode)&&android.versionCode>0);
  assert.equal(typeof android.versionName,'string');
  if(android.published===true){
    assert.equal(android.apk,'downloads/KONA.apk');
    assert.match(android.sha256,/^[a-f0-9]{64}$/i);
    assert.ok(android.bytes>0);
  }else{
    assert.equal('apk' in android,false);
  }
});
test('Android pipeline rebuilds current KONA sources and publishes KONA.apk',()=>{
  assert.match(androidWorkflow,/name: KONA Android App/);
  assert.match(androidWorkflow,/'web\/src\/\*\*'/);
  assert.match(androidWorkflow,/node tools\/build_pages\.mjs/);
  assert.match(androidWorkflow,/node tools\/build_app\.mjs/);
  assert.match(androidWorkflow,/if: needs\.build\.outputs\.signed == 'true' && github\.ref == 'refs\/heads\/main'/);
  assert.match(androidWorkflow,/downloads\/KONA\.apk/);
});
