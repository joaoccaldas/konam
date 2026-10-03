import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root=new URL('../../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const bodyOnly=html=>html.match(/<body[\s\S]*<\/body>/)?.[0]||'';

test('about.html is the Field Guide generated from the promo source',()=>{
  const about=read('about.html'),promo=read('promo.html');
  assert.equal(bodyOnly(about),bodyOnly(promo),'about.html body must be generated from promo.html (node tools/build_pages.mjs)');
  assert.match(about,/<link rel="canonical" href="[^"]*\/about\.html">/);
  assert.doesNotMatch(about,/<link rel="canonical" href="[^"]*\/promo\.html">/);
  assert.match(about,/<title>About Kona\.m · race the version of yourself you haven(?:'|&apos;)t met yet<\/title>/i);
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
