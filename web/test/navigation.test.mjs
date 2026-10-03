import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../src/ui/kona-shell.js',import.meta.url),'utf8');

test('primary mobile nav keeps the canonical five routes but labels Home as Now',()=>{
  const labels=[...source.slice(source.indexOf('<nav class="kona-bottom-nav')).matchAll(/<span>(Now|Discover|Garage|Plan|Me)<\/span>/g)].map(x=>x[1]);
  assert.deepEqual(labels,['Now','Discover','Garage','Plan','Me']);
});

test('persistent nav uses progressive visibility rather than removing canonical routes',()=>{
  const nav=source.slice(source.indexOf('<nav class="kona-bottom-nav'),source.indexOf('</nav>')+6);
  for(const id of ['home','discover','garage','plan','me']) assert.match(nav,new RegExp('data-tab="'+id+'"'));
  assert.match(source,/navigationForState\(readGameState\(\)/);
  assert.match(source,/button\.hidden=!shown\.has\(button\.dataset\.tab\)/);
  assert.doesNotMatch(nav,/<span>(Home|Explore|Setup)<\/span>/);
});
