import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readFileSync } from 'node:fs';

const root=new URL('../../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const stripHead=html=>html.replace(/<head>[\s\S]*?<\/head>/,'<head></head>')
  .replace(/(["'])\.\/(?:about|promo)\.html/g,'$1SELF')
  .replace(/=(["'])(?:about|promo)\.html\1/g,'="SELF"');

test('about.html is the Field Guide generated from the promo source',()=>{
  const about=read('about.html'),promo=read('promo.html');
  assert.equal(stripHead(about),stripHead(promo),'about.html must be regenerated from promo.html (node tools/build_pages.mjs)');
  assert.match(about,/<link rel="canonical" href="[^"]*\/about\.html">/);
  assert.doesNotMatch(about,/<link rel="canonical" href="[^"]*\/promo\.html">/);
  assert.match(about,/<title>About Kona\.m · the Field Guide/);
  for(const href of ['brand/tokens.css','web/styles/promo.css','web/src/promo.js']) assert.ok(about.includes(href),`missing ${href}`);
});

test('Field Guide is the only About runtime authority',()=>{
  const about=read('about.html');
  assert.match(about,/web\/styles\/promo\.css/);
  assert.match(about,/web\/src\/promo\.js/);
  assert.doesNotMatch(about,/about-story\.js|web\/styles\/about\.css/);
  assert.equal(/<style\b/i.test(about),false);
});

test('Field Guide contact is the public Kona.m project inbox, never a private personal address',()=>{
  const promo=read('promo.html');
  assert.match(promo,/konamundo@gmail\.com/);
  assert.doesNotMatch(promo,/joaoccaldas(?:&#64;|@)gmail\.com|Jo[aã]o\s+Caldas/i);
});

test('landing names the Field Guide by purpose',()=>{
  assert.match(read('web/landing.template.html'),/href="about\.html">What is Kona\.m\?<\/a>/);
});


test('Why Kona owns the personal story while About stays the Field Guide',()=>{
  const about=read('about.html'),why=read('why.html'),story=read('web/src/about-story.js');
  assert.match(about,/Field Guide/);
  assert.match(about,/NOW → YOU → WORLD/);
  assert.match(about,/href="why\.html"/);
  assert.doesNotMatch(about,/One of my favourite people recently inspired me/);
  assert.match(why,/web\/styles\/about\.css/);
  assert.match(why,/web\/src\/about-story\.js/);
  assert.match(why,/WHY KONA/);
  assert.match(story,/home\(\)\+short\(\)\+scenic\(\)\+unfiltered\(\)\+final\(\)/);
  assert.match(story,/why\.html\?story=/);
});

test('Field Guide compact layout has an explicit no-occlusion contract',()=>{
  const css=read('web/styles/promo.css');
  assert.match(css,/@media \(pointer:coarse\), \(max-height:560px\)/);
  assert.match(css,/\.promo-header\{[\s\S]*position:sticky/);
  assert.match(css,/\.field-rail-nav\{[\s\S]*position:fixed/);
  assert.match(css,/bottom:calc\(68px \+ env\(safe-area-inset-bottom\)\)/);
});


test('About does not duplicate Why story choices',()=>{
  const promo=fs.readFileSync(new URL('../../promo.html',import.meta.url),'utf8');
  assert.match(promo,/href="why\.html"/);
  assert.doesNotMatch(promo,/why-version-card/);
  assert.doesNotMatch(promo,/The Short Version/);
  assert.doesNotMatch(promo,/The Scenic Route/);
  assert.doesNotMatch(promo,/The Unfiltered Version/);
});
