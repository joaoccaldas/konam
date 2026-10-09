import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {sealInlineScripts} from '../../tools/lib/content-security-policy.mjs';
import {exportAppState,eraseAppState} from '../src/engine/app-state.js';
import {nativeUpdateURL} from '../src/app-shell.js';
const root=path.resolve(import.meta.dirname,'../..');
class Store{
  constructor(rows={}){this.map=new Map(Object.entries(rows));}
  get length(){return this.map.size}key(n){return [...this.map.keys()][n]??null}
  getItem(k){return this.map.get(k)??null}removeItem(k){this.map.delete(k)}setItem(k,v){this.map.set(k,String(v))}
}
test('device privacy operations include owned session data and preserve unrelated records',()=>{
  const local=new Store({'kona.profile.v1':'{}','kona.supabase.session.v1':'secret','other':'keep'});
  const session=new Store({'kona.analytics.session.v1':'session','kona.analytics.acquisition.v2':'{}','other':'keep'});
  const data=JSON.parse(exportAppState(local,session));
  assert.equal(data.entries['kona.supabase.session.v1'],undefined);
  assert.equal(data.session_entries['kona.analytics.session.v1'],'session');
  assert.equal(eraseAppState(local,session),4);
  assert.equal(local.getItem('other'),'keep');assert.equal(session.getItem('other'),'keep');
});
test('native downloads require a published newer APK under the canonical site',()=>{
  const release={published:true,versionCode:6,apk:'downloads/KONA.apk'};
  assert.equal(nativeUpdateURL(release,5),'https://joaoccaldas.github.io/konam/downloads/KONA.apk');
  for(const patch of [{published:false},{versionCode:5},{apk:'//evil.example/app.apk'},{apk:'https://evil.example/app.apk'},{apk:'../downloads/app.apk'},{apk:'downloads/app.apk?x=1'},{apk:'downloads/a".apk'},{versionCode:6.5}])assert.equal(nativeUpdateURL({...release,...patch},5),null);
});
test('inline script seals are deterministic and change with executable content',()=>{
  const html='<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\' \'unsafe-inline\'"><script>window.ok=1;</script>';
  const sealed=sealInlineScripts(html);assert.equal(sealInlineScripts(sealed),sealed);assert.ok(!sealed.includes('unsafe-inline'));
  assert.ok(sealed.includes(createHash('sha256').update('window.ok=1;').digest('base64')));
  assert.notEqual(sealInlineScripts(html.replace('ok=1','ok=2')),sealed);
});
test('all published inline scripts match their CSP, including rebased dist viewers',()=>{
  const files=[...fs.readdirSync(root).filter(f=>f.endsWith('.html')).map(f=>path.join(root,f)),...fs.readdirSync(path.join(root,'web/dist')).filter(f=>f.endsWith('.html')).map(f=>path.join(root,'web/dist',f))];
  for(const file of files){const html=fs.readFileSync(file,'utf8');
    assert.equal(sealInlineScripts(html),html,path.basename(file));
    const policy=html.match(/Content-Security-Policy" content="([^"]+)/)?.[1];
    assert.ok(policy&&!/script-src[^;]*unsafe-inline/.test(policy),file);
  }
});
