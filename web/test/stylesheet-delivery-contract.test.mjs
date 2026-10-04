import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pageDesignLinks} from '../../tools/design-system-manifest.mjs';

const read=rel=>fs.readFileSync(new URL('../../'+rel,import.meta.url),'utf8');
const landing=read('web/landing.template.html');
const harden=read('tools/harden_pages.mjs');
const stage=read('tools/stage_site.sh');
const build=read('tools/build_app.mjs');
const entry=read('web/src/entry.js');
const shell=read('web/src/ui/kona-shell.js');

const core=[...pageDesignLinks('index.html')];
const feature=['web/styles/home.css','web/styles/garage.css','web/styles/race-self.css','web/styles/admin-assets.css','web/styles/companion.css'];

test('core styles are in landing, shared design manifest, staging and PWA cache',()=>{
 assert.match(harden,/design-system-manifest\.mjs/);
 for(const rel of core){
  assert.ok(landing.includes('href="'+rel+'"'),rel+' missing from landing template');
  assert.ok(stage.includes(rel),rel+' missing from staged-site allowlist');
  assert.ok(build.includes("'"+rel+"'"),rel+' missing from PWA manifest builder');
 }
});

test('feature styles are route-loaded but still staged and precached',()=>{
 for(const rel of feature){
  assert.ok(!landing.includes('href="'+rel+'"'),rel+' must not affect landing cascade');
  assert.ok(stage.includes(rel),rel+' missing from staged-site allowlist');
  assert.ok(build.includes("'"+rel+"'"),rel+' missing from offline/integrity cache');
 }
 assert.match(entry,/featureStyle/);
 for(const name of ['home.css','garage.css','race-self.css','companion.css','admin-assets.css'])assert.match(shell,new RegExp(name.replace('.','\\.')));
});

test('Passport presentation is page-scoped, staged and integrity sealed',()=>{
 const rel='web/styles/passport.css';
 assert.ok(!landing.includes('href="'+rel+'"'),rel+' must stay off the consumer landing');
 assert.ok(stage.includes(rel),rel+' missing from staged-site allowlist');
 assert.ok(build.includes("'"+rel+"'"),rel+' missing from offline/integrity cache');
 assert.ok(read('web/experience.template.html').includes('href="'+rel+'"'),rel+' missing from Experiences');
});

test('museum styles remain lazy and integrity sealed',()=>{
 for(const rel of ['web/styles/hall-web.css','web/styles/hall-mobile.css']){
  assert.ok(!landing.includes('href="'+rel+'"'),rel+' must stay out of initial landing');
  assert.ok(build.includes("'"+rel+"'"),rel+' must remain integrity sealed');
 }
});

test('viewport runtime is first-paint, staged and PWA core',()=>{
 assert.match(landing,/app\/viewport\.js/);
 assert.match(stage,/app\/viewport\.js/);
 assert.match(build,/app\/viewport\.js/);
});
