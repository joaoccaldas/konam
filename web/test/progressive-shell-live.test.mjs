import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const shell=fs.readFileSync(new URL('../src/ui/kona-shell.js',import.meta.url),'utf8');
const home=fs.readFileSync(new URL('../src/ui/home.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/system.css',import.meta.url),'utf8');
const mobileCss=fs.readFileSync(new URL('../styles/shell-mobile.css',import.meta.url),'utf8');

test('persistent shell is state-driven rather than five tabs for everyone',()=>{
  assert.match(shell,/navigationForState\(readGameState\(\)/);
  assert.match(shell,/button\.hidden=!shown\.has\(button\.dataset\.tab\)/);
  assert.match(shell,/--nav-count/);
  assert.match(shell,/nav\.dataset\.count=String\(visible\.length\)/);
  assert.match(shell,/aria-hidden/);
  assert.match(shell,/data-tab="home"[\s\S]*<span>Now<\/span>/);
  assert.match(css,/repeat\(var\(--nav-count,5\),1fr\)/);
  assert.match(css,/\[hidden\]/);
  assert.match(mobileCss,/data-count="1"/,'a one-destination shell must not render a full-width redundant nav bar');
  assert.match(mobileCss,/@media\(min-width:900px\)[\s\S]*\.kona-panel-open \.kona-bottom-nav\{display:none\}/,'desktop must not inherit the phone bottom bar');
});

test('first Home does not automatically launch the old guided tour',()=>{
  const now=shell.match(/async function now\(\)\{[\s\S]*?\n  \}/)?.[0]||'';
  assert.doesNotMatch(now,/startTour\(/);
  assert.match(shell,/const replayTour=/,'manual Help replay stays available');
  assert.match(shell,/tour:replayTour/);
});

test('Home depth unfolds after a meaningful discovery',()=>{
  assert.match(home,/const showWorldDepth=admin\|\|meaningfulDiscovery/);
  assert.match(home,/const showHorizon=admin\|\|Number\(progression\.level\|\|1\)>=3/);
  assert.match(home,/showWorldDepth\?'<section class="home-world-hero/);
  assert.match(home,/showInvite\?'<section class="home-invite/);
  assert.match(home,/showHorizon\?'<section class="home-horizon/);
});

test('first visible Home still contains the useful core and one curiosity hook',()=>{
  for(const marker of ['home-today','home-kona-now','home-race-self','home-first-find']) assert.match(home,new RegExp(marker));
});
