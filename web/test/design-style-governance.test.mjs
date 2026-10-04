import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pageDesignLinks,stylesheetLinks} from '../../tools/design-system-manifest.mjs';

const read=rel=>fs.readFileSync(new URL('../../'+rel,import.meta.url),'utf8');

test('landing source and generated index share one stylesheet order authority',()=>{
  const expected=[...pageDesignLinks('index.html')];
  assert.deepEqual(stylesheetLinks(read('web/landing.template.html')),expected);
  assert.deepEqual(stylesheetLinks(read('index.html')),expected);
});

test('hardener consumes the shared stylesheet-order authority',()=>{
  assert.match(read('tools/harden_pages.mjs'),/design-system-manifest\.mjs/);
  assert.doesNotMatch(read('tools/harden_pages.mjs'),/const COMMON_DESIGN_LINKS\s*=\s*\[/);
});

test('every governed CSS file must be explicitly classified',()=>{
  const cfg=JSON.parse(read('config/style-governance.json'));
  const roots=cfg.coverage_roots;
  const walk=dir=>{
    const abs=new URL('../../'+dir+'/',import.meta.url);
    if(!fs.existsSync(abs))return [];
    return fs.readdirSync(abs,{withFileTypes:true}).flatMap(entry=>{
      const rel=dir+'/'+entry.name;
      return entry.isDirectory()?walk(rel):rel.endsWith('.css')?[rel]:[];
    });
  };
  const discovered=[...new Set(roots.flatMap(walk))].sort();
  const classified=Object.values(cfg.classes).flat().sort();
  assert.deepEqual(classified,discovered);
});

test('JavaScript stylesheet exceptions stay empty after Passport convergence',()=>{
  const cfg=JSON.parse(read('config/style-governance.json'));
  assert.equal(cfg.limits.js_style_injectors,0);
  assert.deepEqual(cfg.allowed_js_style_injectors,[]);
});
