import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const contract=JSON.parse(read('config/brand-contract.json'));
const tokens=read('brand/tokens.css');
const type=read('brand/typography.css');
const design=read('docs/DESIGN_SYSTEM.md');

test('canonical brand palette is present in runtime token authority',()=>{
  for(const [name,value] of Object.entries(contract.palette)){
    assert.match(tokens,new RegExp('--'+name+':'+value.replace('#','\\#'),'i'),name+' must match brand contract');
  }
});

test('touch, spacing and radii match the approved contract',()=>{
  assert.match(tokens,/--brand-touch:48px/);
  for(const n of contract.spacing_px) assert.match(tokens,new RegExp(':'+n+'px(?:;|\\})'),n+'px spacing must exist');
  assert.match(tokens,/--brand-control-radius:12px/);
  assert.match(tokens,/--brand-card-radius:20px/);
  assert.match(tokens,/--brand-sheet-radius:24px/);
  assert.match(tokens,/--brand-pill-radius:999px/);
});

test('typography roles remain canonical',()=>{
  assert.match(tokens,/--brand-font-ui:'Manrope'/);
  assert.match(tokens,/--brand-font-editorial:'Instrument Serif'/);
  assert.match(tokens,/--brand-font-data:ui-monospace/);
  assert.match(tokens,/--brand-font-hand:'Caveat'/);
  for(const role of ['t-display','t-title','t-heading','t-body','t-label','t-data','t-hand']){
    assert.match(type,new RegExp('\\.'+role+'\\{'));
  }
});

test('design-system documentation does not drift from runtime authority',()=>{
  assert.match(design,/accent: #ff6a00/i);
  assert.match(design,/cyan\/info: #00a7c7/i);
  assert.match(design,/Minimum touch target: 48 px/i);
  assert.match(design,/Race the version of yourself you haven't met yet\./);
});
