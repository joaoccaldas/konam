import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root=new URL('../../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');

test('Why, About, Origin and Field Guide have separate editorial jobs',()=>{
  const why=read('why.html'),about=read('about.html'),origin=read('origin.html'),guide=read('promo.html');
  assert.match(why,/WHY KONA\.M/);
  assert.match(why,/Triathlon is bigger/);
  assert.doesNotMatch(why,/Excel sheet|HOW TO PLAY|Privacy & data in this beta/i);

  assert.match(about,/ABOUT KONA\.M/);
  assert.match(about,/Home[\s\S]*Discover[\s\S]*Garage[\s\S]*Plan[\s\S]*Me/);
  assert.match(about,/INDEPENDENCE \+ CONTEXT/);
  assert.doesNotMatch(about,/THE SHORT VERSION|Side quest\. Side quest/i);

  assert.match(origin,/ORIGIN STORY \/ OPTIONAL/);
  assert.match(origin,/Excel sheet/);
  assert.match(origin,/Training[\s\S]*Excel[\s\S]*AI[\s\S]*Bikes/);

  assert.match(guide,/FIELD GUIDE/);
  assert.match(guide,/HOW TO PLAY|START HERE/);
  assert.match(guide,/web\/src\/promo\.js/);

  assert.notEqual(about,guide,'About must never be regenerated from the Field Guide');
});

test('editorial pages use one responsive system and keep the origin optional',()=>{
  for(const file of ['why.html','about.html','origin.html']){
    const html=read(file);
    assert.match(html,/web\/styles\/about\.css/);
    assert.doesNotMatch(html,/web\/src\/promo\.js|about-story\.js/);
    assert.match(html,/href="promo\.html">Field Guide/);
    assert.match(html,/mailto:konamundo@gmail\.com/);
  }
  assert.match(read('about.html'),/href="origin\.html"/);
  assert.match(read('why.html'),/href="origin\.html"/);
});

test('the hardener cannot collapse About back into the Field Guide',()=>{
  const hardener=read('tools/harden_pages.mjs');
  assert.doesNotMatch(hardener,/MIRRORS|About is the Field Guide|generated from the promo source/);
  for(const file of ['why.html','about.html','origin.html','promo.html']) assert.match(hardener,new RegExp("file: '"+file.replace('.','\\.')+"'"));
});

test('public Intern contact is a project inbox, never the creator personal address',()=>{
  for(const file of ['why.html','about.html','origin.html','promo.html']){
    const html=read(file);
    if(file!=='promo.html') assert.match(html,/konamundo@gmail\.com/);
    assert.doesNotMatch(html,/joaoccaldas(?:&#64;|@)gmail\.com|Jo[aã]o\s+Caldas/i);
  }
});

test('landing separates product explanation from optional origin',()=>{
  const landing=read('web/landing.template.html');
  assert.match(landing,/href="about\.html">What is Kona\.m\?<\/a>/);
  assert.match(landing,/href="origin\.html">Read the origin/);
});
