import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const template=fs.readFileSync(new URL('../landing.template.html',import.meta.url),'utf8');
const world=fs.readFileSync(new URL('../world-shell.template.html',import.meta.url),'utf8');
const entry=fs.readFileSync(new URL('../src/entry.js',import.meta.url),'utf8');
const build=fs.readFileSync(new URL('../build_landing.mjs',import.meta.url),'utf8');
const install=fs.readFileSync(new URL('../src/ui/install.js',import.meta.url),'utf8');
const appShell=fs.readFileSync(new URL('../src/app-shell.js',import.meta.url),'utf8');

test('consumer index template contains no museum runtime DOM',()=>{
  for(const id of ['hall','rail','card','joy','tourPill','coach','fallback','nearby']) {
    assert.doesNotMatch(template,new RegExp('id=["\\\']'+id+'["\\\']'));
    assert.match(world,new RegExp('id=["\\\']'+id+'["\\\']'));
  }
  assert.match(template,/id="intro"/);
  assert.doesNotMatch(template,/id="appSheet"|id="updateBar"/);
  assert.match(install,/ensureInstallSheet/);assert.match(appShell,/ensureUpdateBar/);
  assert.match(template,/app\/viewport\.js/);
  assert.match(template,/app\/kona-core\.js/);
  assert.doesNotMatch(template,/hall-web\.css|hall-mobile\.css/);
});
test('world shell is injected before museum runtime loads',()=>{
  assert.match(entry,/ensureWorldShell/);
  assert.match(entry,/app\/world-shell\.html/);
  assert.match(entry,/hall-web\.css/);
  assert.match(entry,/hall-mobile\.css/);
  assert.match(entry,/ensureWorldShell\(\)[\s\S]*ensureMuseumData\(\)[\s\S]*app\/hall\.js/);
});
test('build emits world shell as deterministic output',()=>{
  assert.match(build,/world-shell\.template\.html/);
  assert.match(build,/app\/world-shell\.html/);
  assert.match(build,/src\/runtime\/viewport\.js/);
  assert.match(build,/app\/viewport\.js/);
});

test('immersive world has contextual controls rather than a second global navigation',()=>{
  for(const id of ['backKonaBtn','mapBtn','soundBtn','worldMoreBtn','worldMoreMenu']) assert.match(world,new RegExp('id=["\\\']'+id+'["\\\']'));
  for(const legacy of ['passportBtn','studioLink','shareBtn','>Compare<','>Archive<']) assert.doesNotMatch(world,new RegExp(legacy));
});
