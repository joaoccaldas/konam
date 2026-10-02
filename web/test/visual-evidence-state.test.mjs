import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const src=fs.readFileSync(new URL('../visual-evidence-v2.mjs',import.meta.url),'utf8');
test('visual harness uses canonical runtime shell',()=>assert.match(src,/window\.__konaShell/));
test('state transition failure is blocking',()=>assert.match(src,/could not enter requested state/));
test('non-landing captures reject visible landing intro',()=>assert.match(src,/landing intro still visible after state transition/));
test('current product surfaces have semantic assertions',()=>{for(const marker of ['User Studio content missing','sign-in form missing','avatar registration missing','Home discovery surface missing','avatar editor missing','no Plan content detected','no Progress content detected','no Feed content detected','no Travel content detected','Bike Studio missing'])assert.ok(src.includes(marker));});
test('visual harness blocks CSS lifecycle and stage geometry regressions',()=>{
  assert.match(src,/museum CSS remained enabled after returning Home/);
  assert.match(src,/museum header styling leaked into companion page/);
  assert.match(src,/User Studio stage too small/);
  assert.match(src,/museum-return-home/);assert.match(src,/onboarding-tour/);
});
