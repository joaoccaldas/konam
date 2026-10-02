#!/usr/bin/env node
// RC8 brand authority gate. Keep this narrow and enforceable: it prevents new parallel design systems.
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const errors=[];
const active=[
 'web/styles/system.css','web/styles/shell-mobile.css','web/styles/home.css','web/styles/garage.css',
 'web/styles/race-self.css','web/styles/entry.css','web/styles/studio.css',
 'web/styles/collection.css','web/styles/experience.css','web/styles/components.css','web/styles/admin-assets.css'
];
for(const rel of active){
 const css=read(rel);
 if(/--(?:sans|serif|mono)\s*:\s*['"][^'"]/.test(css))errors.push(rel+': owns a raw font family; alias brand tokens instead');
 if(/font-family\s*:\s*['"]?(?:Inter|Manrope|Instrument Serif)/i.test(css))errors.push(rel+': hard-codes a brand font');
 if(/--(?:sand|paper|ink|muted|faint|reef|lava)\s*:\s*#[0-9a-f]{3,8}/i.test(css))errors.push(rel+': owns a raw palette alias instead of brand tokens');
}
const consumer=[
 'web/styles/system.css','web/styles/shell-mobile.css','web/styles/home.css','web/styles/garage.css',
 'web/styles/race-self.css','web/styles/entry.css','web/styles/companion.css','web/styles/admin-assets.css'
];
let importantTotal=0;
for(const rel of consumer){
 const css=read(rel);
 importantTotal+=(css.match(/!important/g)||[]).length;
 if(/var\(--(?:safe-b|sand|paper|ink|muted|faint|reef|lava)\b/.test(css))errors.push(rel+': consumer CSS depends on a legacy/museum variable');
 if(/@media[^\{]*760px/.test(css))errors.push(rel+': uses the retired 760px app breakpoint; use compact <900 / wide >=900 unless component-local');
}
if(importantTotal>12)errors.push('consumer CSS !important budget exceeded: '+importantTotal+' > 12');
const tokens=read('brand/tokens.css'),components=read('web/styles/components.css'),shell=read('web/src/ui/kona-shell.js'),landing=read('web/landing.template.html'),system=read('web/styles/system.css'),harden=read('tools/harden_pages.mjs');
for(const token of ['--brand-sand','--brand-lava','--brand-ocean','--brand-sunrise','--brand-hibiscus','--brand-lilac','--brand-lime','--brand-font-ui','--brand-font-editorial','--brand-font-data','--brand-font-hand','--brand-mobile-gutter:20px'])if(!tokens.includes(token))errors.push('brand/tokens.css missing '+token);
for(const primitive of ['.btn-primary','.btn-secondary','.btn-text','.btn-icon','.ui-input','.ui-sheet'])if(!components.includes(primitive))errors.push('components.css missing '+primitive);
if(!/\[data-tab=home\]'\)\.onclick=now/.test(shell))errors.push('Home tab must invoke canonical Home, not Race Self');
if(!read('web/styles/studio.css').includes('--sand:var(--brand-bg)'))errors.push('Studio must consume brand tokens');
if(!read('web/styles/experience.css').includes('--accent:var(--brand-sunrise)'))errors.push('Experiences must consume brand accent');
if(!read('web/styles/collection.css').includes('font-family:var(--brand-font-ui)'))errors.push('Collection must consume brand typography');
if(!landing.includes('web/styles/components.css'))errors.push('landing must load canonical components.css');
if(/#appSheet[^\n]*var\(--safe-b\)/.test(system))errors.push('install sheet must not depend on museum safe-area variables');
if(!system.includes('env(safe-area-inset-bottom)'))errors.push('install sheet must use platform safe-area environment values');
if(!/family=Caveat:wght@500;600&family=Instrument\+Serif:ital@0;1&family=Manrope:wght@300\.\.800/.test(harden))errors.push('hardener must own the complete KONA font request through Manrope 800');
if((landing.match(/fonts\.googleapis\.com\/css2\?/g)||[]).length!==1)errors.push('landing must have exactly one Google Fonts stylesheet');
if(errors.length){console.error('brand authority gate failed');for(const e of errors)console.error(' - '+e);process.exit(1);}
console.log('brand authority gate: PASS ('+active.length+' active styles checked)');

// final frozen-candidate validation trigger
