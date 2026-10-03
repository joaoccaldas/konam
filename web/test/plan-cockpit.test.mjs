import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const plan=fs.readFileSync(new URL('../src/ui/plan.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/plan.css',import.meta.url),'utf8');
const shell=fs.readFileSync(new URL('../src/ui/kona-shell.js',import.meta.url),'utf8');
const smoke=fs.readFileSync(new URL('../p0-journey-smoke.mjs',import.meta.url),'utf8');
const audit=fs.readFileSync(new URL('../ui-interaction-audit.mjs',import.meta.url),'utf8');

test('Plan is a visual cockpit, not a long briefing wall',()=>{
  for(const marker of ['plan-hero','plan-priority','plan-timeline','plan-arrival-grid','plan-places','plan-sources']) assert.match(plan,new RegExp(marker));
  assert.match(plan,/data-kona-weather/);
  assert.match(plan,/Arrival without drama/);
  assert.match(plan,/Your week at a glance/);
  assert.match(plan,/Official sources/);
  assert.doesNotMatch(plan,/kona-brief-thumbnail/);
});

test('Plan keeps only one editorial Intern interruption',()=>{
  assert.equal((plan.match(/plan-intern/g)||[]).length,1);
});

test('Plan remains lightweight and source-grounded',()=>{
  assert.match(plan,/race_week/);
  assert.match(plan,/api\.weather\.gov/);
  assert.match(plan,/loadCompanion\('travel'/);
  assert.doesNotMatch(plan,/from ['\"]three|hall\.js|museum-data\.js|__museum/i);
});

test('Plan browser checks read the cockpit markup',()=>{
  assert.match(smoke,/querySelectorAll\('\.plan-day'\)/);
  assert.doesNotMatch(smoke,/kona-timeline article/);
  assert.match(audit,/\$\$\('\.plan-priority-card'\)/);
  assert.match(audit,/\$\$\('\.plan-day'\)/);
});

test('Plan owns a dedicated on-demand visual layer',()=>{
  assert.match(shell,/featureStyle\('plan','web\/styles\/plan\.css'\)/);
  assert.match(css,/\.plan-cockpit/);
  assert.match(css,/\.plan-priority/);
  assert.match(css,/\.plan-timeline/);
  assert.match(css,/var\(--brand-action\)/);
  assert.doesNotMatch(css,/#(?:[0-9a-f]{3,8})\b/i,'Plan CSS must use brand tokens instead of raw colors');
});
