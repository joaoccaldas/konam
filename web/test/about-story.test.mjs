import test from 'node:test';
import assert from 'node:assert/strict';
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

test('Why Kona is one continuous personal story, not three duplicate route choices',()=>{
  const promo=read('promo.html');
  for(const id of ['why-origin','why-evolution','why-sidequests','why-move','why-arrival']) assert.match(promo,new RegExp(`id="${id}"`));
  assert.match(promo,/WHY KONA\.M EXISTS \/ THE REAL STORY/);
  assert.match(promo,/One story\.<br><em>Keep scrolling\.<\/em>/);
  assert.doesNotMatch(promo,/story=(?:short|scenic|unfiltered)/);
  assert.equal((promo.match(/I am proud we got here\./g)||[]).length,1);
  assert.equal((promo.match(/There was no grand master plan/g)||[]).length,1);
});

test('Field Guide hero introduces the page without retelling the Why story',()=>{
  const promo=read('promo.html');
  const hero=promo.match(/<section class="promo-hero"[\s\S]*?<\/section>/)?.[0]||'';
  assert.match(hero,/The first part is personal\. It appears once, below, in full\./);
  assert.doesNotMatch(hero,/I am proud this exists|Excel sheet|3D bikes\. Then a game/);
});

test('short coarse landscape moves chrome away from editorial text',()=>{
  const css=read('web/styles/promo.css');
  assert.match(css,/@media\(pointer:coarse\) and \(orientation:landscape\) and \(max-height:700px\)/);
  assert.match(css,/\.promo-header\{position:absolute/);
  assert.match(css,/\.field-rail\{display:none\}/);
  assert.match(css,/\.promo-section\{scroll-margin-top:18px\}/);
});
