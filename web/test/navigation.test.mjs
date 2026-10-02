import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../src/ui/kona-shell.js',import.meta.url),'utf8');

test('primary mobile nav exposes exactly the canonical five destinations',()=>{
  const labels=[...source.slice(source.indexOf('<nav class="kona-bottom-nav')).matchAll(/<span>(Home|Discover|Garage|Plan|Me)<\/span>/g)].map(x=>x[1]);
  assert.deepEqual(labels,['Home','Discover','Garage','Plan','Me']);
});

test('legacy primary labels are not exposed in bottom navigation',()=>{
  const nav=source.slice(source.indexOf('<nav class="kona-bottom-nav'),source.indexOf('</nav>')+6);
  assert.equal(/<span>(Now|Explore|Setup)<\/span>/.test(nav),false);
});
