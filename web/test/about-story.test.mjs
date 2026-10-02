import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root=new URL('../../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');

test('About route uses canonical brand authorities without inline styling',()=>{
  const html=read('about.html');
  for(const href of ['brand/tokens.css','brand/themes.css','brand/artifacts.css','brand/typography.css','web/styles/components.css','web/styles/system.css','web/styles/about.css']) assert.ok(html.includes(href),`missing ${href}`);
  assert.equal(/<style\b/i.test(html),false);
  assert.equal(/style="/i.test(html),false);
});

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
