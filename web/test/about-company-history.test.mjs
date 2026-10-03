import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=path.resolve(import.meta.dirname,'../..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const json=p=>JSON.parse(read(p));

test('company history has one canonical ordered public timeline',()=>{
  const h=json('content/company-history.json');
  assert.equal(h.schema_version,1);
  assert.equal(h.public_frontend_anonymous,true);
  assert.ok(h.phases.length>=8);
  assert.equal(new Set(h.phases.map(x=>x.id)).size,h.phases.length);
  assert.deepEqual(h.phases.map(x=>x.index),h.phases.map((_,i)=>String(i).padStart(2,'0')));
  assert.ok(h.phases.some(x=>x.id==='canyonmuseum'));
  assert.ok(h.phases.some(x=>x.id==='konam'));
});

test('tutorial suite is exactly nine short optional films and never a first-run gate',()=>{
  const s=json('content/tutorial-video-suite.json');
  assert.equal(s.videos.length,9);
  assert.deepEqual(s.videos.map(x=>x.index),[1,2,3,4,5,6,7,8,9]);
  assert.equal(s.public_policy.optional,true);
  assert.equal(s.public_policy.blocks_first_run,false);
  assert.equal(s.public_policy.autoplay_audio,false);
  assert.equal(s.public_policy.skippable,true);
  assert.ok(s.videos.every(v=>v.duration_seconds<=s.public_policy.max_single_clip_seconds));
});

test('public Field Guide includes generated history and film map without local file paths',()=>{
  const promo=read('promo.html');
  assert.match(promo,/<!--company-history:start-->/);
  assert.match(promo,/data-company-history/);
  assert.match(promo,/<!--tutorial-film-suite:start-->/);
  assert.match(promo,/data-film-suite/);
  for(let i=1;i<=9;i++)assert.ok(promo.includes('<b>0'+i+'</b>'));
  assert.doesNotMatch(promo,/file:\/\//i);
});

test('About is generated from the rich Field Guide rather than maintained as a second story',()=>{
  const about=read('about.html');
  const build=read('tools/build_pages.mjs');
  assert.match(about,/GENERATED FROM promo\.html BY tools\/build_about_company\.mjs/);
  assert.match(about,/data-company-history/);
  assert.match(about,/data-film-suite/);
  assert.match(build,/build_public_story\.mjs/);
  assert.match(build,/build_about_company\.mjs/);
  assert.doesNotMatch(about,/file:\/\//i);
});

test('first-run entry remains film-independent',()=>{
  const entry=read('web/landing.template.html');
  assert.doesNotMatch(entry,/kona_intro_\d+.*\.mp4/i);
  assert.doesNotMatch(entry,/assets\/tutorials\//i);
});

test('tutorial binaries are never referenced publicly until repo publication is explicit',()=>{
  const suite=json('content/tutorial-video-suite.json');
  const promo=read('promo.html');
  for(const film of suite.videos){
    if(!film.published)assert.equal(promo.includes(film.file_name),false,film.file_name+' should not be public yet');
  }
});
