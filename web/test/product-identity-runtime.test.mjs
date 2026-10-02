import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL('../../'+p,import.meta.url),'utf8');

test('clear consumer identity surfaces use canonical product metadata',()=>{
  const files=[
    'web/src/ui/home.js',
    'web/src/ui/avatar-home.js',
    'web/src/ui/settings.js',
    'web/src/ui/onboarding-questions.js',
    'web/src/map.js',
    'web/src/growth/social-share.js',
    'web/src/engine/share.js'
  ];
  for(const file of files){
    const text=read(file);
    assert.match(text,/PRODUCT_NAME/,file+' must consume canonical product identity');
  }
});

test('consumer product phrases do not reintroduce legacy KONA branding',()=>{
  const checks={
    'web/src/ui/home.js':[/KONA Finds/,/KONA NUDGE/,/KONA · TODAY/],
    'web/src/ui/avatar-home.js':[/Share KONA/,/KONA title screen/,/30-second KONA intro/,/Clean KONA link copied/],
    'web/src/ui/settings.js':[/What should KONA call you/,/KONA nudges/,/sync your KONA progress/,/KONA · local-first beta/],
    'web/src/growth/social-share.js':[/KONA · Level/,/KONA · PROGRESS/,/My KONA progress/],
    'web/src/map.js':[/KONA · WORLD MAP/]
  };
  for(const [file,patterns] of Object.entries(checks)){
    const text=read(file);
    for(const pattern of patterns)assert.doesNotMatch(text,pattern,file+' contains legacy consumer identity '+pattern);
  }
});

test('Kona place and Canyon/Speedmax historical language is not globally renamed',()=>{
  assert.match(read('web/src/ui/onboarding-questions.js'),/What brings you to Kona\?/);
  assert.match(read('web/src/ui/home.js'),/KAILUA-KONA · HAWAIʻI/);
  assert.match(read('docs/BUSINESS_PLAN.md'),/Canyon Museum/);
});
