import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root=new URL('../../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');

test('About is the Field Guide, generated from promo.html with its own URL and title',()=>{
  const about=read('about.html'),promo=read('promo.html');
  const body=html=>html.replace(/<!--harden:start-->[\s\S]*?<!--harden:end-->\n?/,'').replace(/<title>[^<]*<\/title>/,'').replace(/<meta name="description" content="[^"]*">/,'').replace(/(href|content)="[^"]*\/(?:about|promo)\.html"/g,'$1="SELF"');
  assert.equal(body(about),body(promo),'about.html must be regenerated from promo.html (node tools/build_pages.mjs)');
  assert.match(about,/<link rel="canonical" href="[^"]*\/about\.html">/);
  assert.doesNotMatch(about,/<link rel="canonical" href="[^"]*\/promo\.html">/);
  assert.match(about,/<title>About Kona\.m · the Field Guide/);
  for(const href of ['brand/tokens.css','web/styles/promo.css','web/src/promo.js']) assert.ok(about.includes(href),`missing ${href}`);
});

// The previous three-depth About story is retained as source but no longer shipped.
test('About route exposes three depths without personal identity or confidential strategy',()=>{
  const source=read('web/src/about-story.js');
  for(const route of ["'short'","'scenic'","'unfiltered'","'final'"]) assert.ok(source.includes(route));
  assert.ok(source.includes('Finished enough to let you in.'));
  assert.ok(source.includes('One bike. One room. One road.'));
  assert.equal(/Jo[aã]o|Caldas|gmail|street address|phone number/i.test(source),false);
  assert.equal(/\$\s*\d|subscription|pavilion licensing|revenue|monetiz|pricing|roadmap|2027 platform/i.test(source),false);
});

test('About stylesheet stays route scoped and token driven',()=>{
  const css=read('web/styles/about.css');
  assert.ok(css.includes('.about-page'));
  assert.ok(css.includes('var(--brand-bg)'));
  assert.ok(css.includes('var(--brand-font-editorial)'));
  assert.ok(css.includes('var(--brand-font-hand)'));
  assert.equal(/:root\s*\{/.test(css),false);
});

test('landing exposes About this company',()=>{
  const template=read('web/landing.template.html');
  assert.ok(template.includes('href="about.html">About this company</a>'));
});
