import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL('../../'+p,import.meta.url),'utf8');

test('Why Kona is globally reachable without replacing the five primary tabs',()=>{
  const landing=read('web/landing.template.html');
  const shell=read('web/src/ui/kona-shell.js');
  const hardener=read('tools/harden_pages.mjs');
  const css=read('web/styles/system.css');

  assert.match(landing,/Curious how this began\? <a href="why\.html">Read Why Kona/);
  assert.match(shell,/class="kona-why-global" href="why\.html"/);
  assert.match(shell,/class="kona-panel-why" href="why\.html"/);
  assert.doesNotMatch(shell,/data-tab="why"|data-desktop-tab="why"/);

  assert.match(hardener,/class="global-kona-links"/);
  assert.match(hardener,/class="global-why-kona" href="why\.html"/);
  assert.match(hardener,/class="global-user-studio" href="index\.html\?view=me"/);

  assert.match(css,/\.kona-why-global\{/);
  assert.match(css,/\.kona-panel-why\{/);
  assert.match(css,/\.global-kona-links\{/);
  assert.match(css,/\.global-user-studio,\.global-why-kona\{/);
});

// Source-sync branch: global Why route is release-certified through deterministic generation.
