import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {installState} from '../src/engine/install-state.js';
const tpl=fs.readFileSync(new URL('../landing.template.html',import.meta.url),'utf8');
const shell=fs.readFileSync(new URL('../src/app-shell.js',import.meta.url),'utf8');
const mobile=fs.readFileSync(new URL('../styles/shell-mobile.css',import.meta.url),'utf8');
const viewport=fs.readFileSync(new URL('../src/runtime/viewport.js',import.meta.url),'utf8');
const system=fs.readFileSync(new URL('../styles/system.css',import.meta.url),'utf8');

test('manifest is linked and viewport uses device width',()=>{
 assert.match(tpl,/name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/);
 assert.match(tpl,/rel="manifest" href="\.\/manifest\.webmanifest"/);
});
test('device-fit behavior has one external runtime owner',()=>{const entry=fs.readFileSync(new URL('../src/entry.js',import.meta.url),'utf8');assert.match(tpl,/app\/viewport\.js/);assert.doesNotMatch(tpl,/classList\.toggle\('phone-fit'/);assert.doesNotMatch(entry,/classList\.(?:add|toggle)\('phone-fit'/);assert.match(viewport,/classList\.toggle\('phone-fit'/);assert.match(viewport,/short<=500&&innerWidth>820/);});
test('hero install action is visible in source and owned by app shell',()=>{
 assert.match(tpl,/id="entryInstall"/);
 assert.match(shell,/initInstall/);
 const install=fs.readFileSync(new URL('../src/ui/install.js',import.meta.url),'utf8');
 assert.match(install,/#entryInstall,#installBtn/);
 assert.match(install,/document.addEventListener\('click'/);
});
test('Android always has an install route even before browser prompt event',()=>{
 const manual=installState({android:true,deferred:false}),prompt=installState({android:true,deferred:true});
 assert.equal(manual.kind,'android-instructions');assert.equal(manual.action,'instructions');assert.equal(manual.show,true);
 assert.equal(prompt.kind,'android-prompt');assert.equal(prompt.action,'prompt');assert.equal(prompt.show,true);
});
test('installed standalone hides install affordance',()=>assert.equal(installState({standalone:true}).show,false));
test('mobile entry uses responsive width plus guarded desktop-view phone scaling',()=>{
 assert.match(system,/html,body\{width:100%;max-width:100%;margin:0;padding:0;overflow-x:hidden\}/);
 assert.match(mobile,/html\.phone-fit/);
 assert.match(mobile,/zoom:var\(--fit\)/);
});

test('entry path stays 3D-free until explicit world entry',()=>{
 const entry=fs.readFileSync(new URL('../src/entry.js',import.meta.url),'utf8');
 assert.equal(/from ['"]three|THREE\./.test(entry),false);
 assert.equal(/\.glb['"]/i.test(entry),false);
 assert.match(entry,/loadScript\('app\/hall\.js'\)/);
 assert.match(entry,/function openMuseum|const openMuseum/);
});
