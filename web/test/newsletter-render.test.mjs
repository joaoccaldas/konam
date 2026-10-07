import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareNewsletter} from '../../newsletter/render.mjs';

const input=()=>({
  edition_date:'2026-10-05',
  intro:'One beautiful bike. Three useful stories. Less noise.',
  intern_currently:'Everything worked. Suspicious.',
  bike:{
    id:'canyon-cfr-2027',
    name:'Speedmax CFR AXS',
    brand:'Canyon',
    year:2027,
    image:'assets/entry/catalog/canyon-cfr-2027.webp',
    glb:'assets/museum/speedmax_web.glb',
    viewer:'Speedmax_Museum.html',
    verified:true
  },
  stories:[1,2,3].map(n=>({
    category:'STORIES',
    published_at:'2026-10-04',
    source:'Source '+n,
    url:'https://example.test/story-'+n,
    image:'assets/kona-years/kailua-bay.jpg',
    headline:'Story '+n,
    summary:'A verified summary.',
    intern:n===1?'A separate opinion.':'',
    verified:true
  }))
});

test('newsletter preserves edition identity, exact branded hierarchy and unsubscribe placeholder',()=>{
  const edition=prepareNewsletter(input());
  assert.equal(edition.id,'intern-2026-10-05');
  assert.match(edition.subject,/The Intern read the internet/);
  assert.match(edition.html,/BIKE OF THE DAY/);
  assert.match(edition.html,/REAL KONA\.m 3D ASSET/);
  assert.match(edition.html,/Three things worth your time today/);
  assert.match(edition.html,/THE INTERN, CURRENTLY/);
  assert.match(edition.html,/assets\/entry\/catalog\/canyon-cfr-2027\.webp/);
  assert.match(edition.html,/raw\.githubusercontent\.com\/joaoccaldas\/konam\/main\/assets\/museum\/speedmax_web\.glb/);
  assert.match(edition.html,/\{\{UNSUBSCRIBE_URL\}\}/);
  assert.equal(edition.stories.length,3);
  assert.equal(edition.bike.id,'canyon-cfr-2027');
});

test('newsletter keeps compact image-led story rows instead of mobile full-width stacking',()=>{
  const html=prepareNewsletter(input()).html;
  assert.match(html,/width="29%"/);
  assert.match(html,/width="71%"/);
  assert.match(html,/story-title/);
  assert.match(html,/width:128%/);
  assert.match(html,/background:#080b0e/);
  assert.doesNotMatch(html,/konamundo@gmail\.com/);
  assert.doesNotMatch(html,/\.story-img\{width:100%/);
  assert.doesNotMatch(html,/\.story-copy\{display:block/);
});

test('newsletter refuses missing, duplicate, unsafe, unverified, future or stale stories',()=>{
  for(const mutate of [
    x=>x.stories.pop(),
    x=>x.stories[1].url=x.stories[0].url,
    x=>x.stories[0].url='javascript:alert(1)',
    x=>x.stories[0].verified=false,
    x=>x.stories[0].published_at='2026-10-06',
    x=>x.stories[0].published_at='2026-09-27',
    x=>x.stories[0].published_at='2026-02-30',
    x=>x.stories[0].image='javascript:bad'
  ]){const x=input();mutate(x);assert.throws(()=>prepareNewsletter(x));}
});

test('newsletter refuses ungrounded or malformed Bike of the Day assets',()=>{
  for(const mutate of [
    x=>delete x.bike,
    x=>x.bike.verified=false,
    x=>x.bike.image='https://example.test/bike.svg',
    x=>x.bike.glb='assets/museum/not-a-bike.png',
    x=>x.bike.viewer='javascript:alert(1)'
  ]){const x=input();mutate(x);assert.throws(()=>prepareNewsletter(x));}
});

test('newsletter treats source titles and Intern commentary as text, including attribute delimiters',()=>{
  const x=input();
  x.intro='<script>alert(1)</script>';
  x.stories[0].headline='" onclick="bad';
  x.stories[0].url='https://example.test/story?a="';
  const html=prepareNewsletter(x).html;
  assert.doesNotMatch(html,/<script>|onclick="bad/);
  assert.match(html,/&lt;script&gt;/);
  assert.match(html,/&quot; onclick=&quot;bad/);
});
