// Release certification trigger: About source, generated mirror and public metadata are validated together.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('../../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
const promo=read('promo.html');
const promoJs=read('web/src/promo.js');
const promoCss=read('web/styles/promo.css');
const meta=JSON.parse(read('config/product-meta.json'));
const hardener=read('tools/harden_pages.mjs');

test('Kona.m north-star proposition has one full canonical wording',()=>{
  assert.equal(meta.product_tagline,"Race the version of yourself you haven't met yet.");
  assert.match(promo,/Race the version<br><em>of yourself you haven't met yet\.<\/em>/);
  assert.match(hardener,/race the version of yourself you haven't met yet/i);
});

test('About explains the product before the origin story',()=>{
  assert.ok(promo.indexOf('id="what"')>0);
  assert.ok(promo.indexOf('id="what"')<promo.indexOf('id="why-three-ways"'));
  for(const word of ['Now','You','World']) assert.match(promo,new RegExp('<h3>'+word+'<\\/h3>'));
  for(const status of ['NOW','LAB','NEXT','UNKNOWN']) assert.match(promo,new RegExp('status-[a-z]+">'+status+'<'));
});

test('About separates live product from prototypes and roadmap',()=>{
  assert.match(promo,/CANONICAL \/ EXPANDING/);
  assert.match(promo,/full 141 are not yet all wired/);
  assert.match(promo,/fuller key, clue and occasional guessing-challenge system is a roadmap mechanic still being built/);
  assert.match(promo,/connected training and performance intelligence are a future layer/i);
  assert.match(promo,/status-lab">LAB<\/span> \/ VISUAL REFERENCE/);
  assert.match(promo,/separate studio-kona world prototype/);
  assert.match(promo,/not the current Kona\.m training layer/);
  assert.doesNotMatch(promo,/The collection is real: 14 founding rooms/);
});

test('interactive world selector preserves status truth after clicks',()=>{
  assert.match(promoJs,/kona:\{status:'NOW'/);
  for(const id of ['vegas','stgeorge','nice']) assert.match(promoJs,new RegExp(id+":\\{status:'LAB'"));
  assert.match(promoJs,/Open prototype/);
});

test('About clarity styling consumes the approved brand system',()=>{
  assert.match(promoCss,/\.promo-what/);
  assert.match(promoCss,/\.status-now/);
  assert.match(promoCss,/\.status-lab/);
  assert.match(promoCss,/\.status-next/);
  assert.match(promoCss,/\.status-unknown/);
  assert.match(promoCss,/var\(--brand-action\)/);
  assert.match(promoCss,/var\(--brand-ocean\)/);
});

test('Why tells the origin without turning About into a personal profile',()=>{
  assert.match(promo,/A return to triathlon, encouraged by someone close/);
  assert.match(promo,/The first solution was an Excel sheet/);
  assert.match(promo,/Kona\.m is about becoming, not merely tracking/);
  assert.doesNotMatch(promo,/Jo[aã]o\s+Caldas|joaoccaldas@gmail\.com/i);
});
