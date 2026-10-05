#!/usr/bin/env node
// Visual sovereignty gate.
//
// Goals:
// 1. Every shipped/style authority is classified. New CSS cannot silently bypass governance.
// 2. Current visual debt is a ratchet: it may fall, but not grow without an explicit baseline change.
// 3. Canonical/immersive CSS cannot invent another font/palette authority.
// 4. Runtime stylesheet order has one source of truth.
// 5. JavaScript-injected design systems are visible debt rather than an invisible loophole.
import fs from 'node:fs';
import path from 'node:path';
import {pageDesignLinks,stylesheetLinks} from './design-system-manifest.mjs';

const root=path.resolve(import.meta.dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const governance=JSON.parse(read('config/style-governance.json'));
const errors=[];

const walk=(dir,predicate,out=[])=>{
 const abs=path.join(root,dir);
 if(!fs.existsSync(abs))return out;
 for(const entry of fs.readdirSync(abs,{withFileTypes:true})){
  const rel=path.posix.join(dir,entry.name);
  if(entry.isDirectory())walk(rel,predicate,out);
  else if(predicate(rel))out.push(rel);
 }
 return out;
};

const discovered=[...new Set(governance.coverage_roots.flatMap(dir=>walk(dir,p=>p.endsWith('.css'))))].sort();
const classifiedEntries=Object.entries(governance.classes).flatMap(([kind,files])=>files.map(file=>({kind,file})));
const classified=classifiedEntries.map(x=>x.file);
const duplicates=classified.filter((file,index)=>classified.indexOf(file)!==index);
if(duplicates.length)errors.push('style classification duplicates: '+[...new Set(duplicates)].join(', '));
for(const file of discovered)if(!classified.includes(file))errors.push('unclassified CSS authority: '+file);
for(const file of classified)if(!discovered.includes(file))errors.push('classified CSS missing from repository: '+file);

const strict=governance.strict_classes.flatMap(kind=>governance.classes[kind]||[]);
for(const rel of strict){
 const css=read(rel);
 if(/--(?:sans|serif|mono)\s*:\s*['"][^'"]/.test(css))errors.push(rel+': owns a raw font family; alias brand tokens instead');
 if(/font-family\s*:\s*['"]?(?:Inter|Manrope|Instrument Serif)/i.test(css))errors.push(rel+': hard-codes a brand font');
 if(/--(?:sand|paper|ink|muted|faint|reef|lava)\s*:\s*#[0-9a-f]{3,8}/i.test(css))errors.push(rel+': owns a raw palette alias instead of brand tokens');
}

const consumer=governance.classes.canonical||[];
let consumerImportant=0;
for(const rel of consumer){
 const css=read(rel);
 consumerImportant+=(css.match(/!important/g)||[]).length;
 if(/var\(--(?:safe-b|sand|paper|ink|muted|faint|reef|lava)\b/.test(css))errors.push(rel+': consumer CSS depends on a legacy/museum variable');
 if(/@media[^\{]*760px/.test(css))errors.push(rel+': uses the retired 760px app breakpoint; use compact <900 / wide >=900 unless component-local');
}
if(consumerImportant>governance.limits.consumer_important)errors.push('consumer CSS !important budget exceeded: '+consumerImportant+' > '+governance.limits.consumer_important);

const debtFiles=discovered.filter(file=>governance.debt_scope_roots.some(dir=>file===dir||file.startsWith(dir+'/')));
let allImportant=0,allRawHex=0,zIndexNumeric=0,rawFontDeclarations=0;
const breakpoints=new Set();
for(const rel of debtFiles){
 const css=read(rel);
 allImportant+=(css.match(/!important/g)||[]).length;
 allRawHex+=(css.match(/#[0-9a-fA-F]{3,8}\b/g)||[]).length;
 zIndexNumeric+=(css.match(/z-index\s*:\s*-?\d+/g)||[]).length;
 rawFontDeclarations+=(css.match(/font-family\s*:\s*(?!var\()/g)||[]).length;
 for(const match of css.matchAll(/@media[^\{]*?(?:min|max)-(?:width|height)\s*:\s*(\d+)px/g))breakpoints.add(Number(match[1]));
}
if(allImportant>governance.limits.all_important)errors.push('all CSS !important debt increased: '+allImportant+' > '+governance.limits.all_important);
if(allRawHex>governance.limits.all_raw_hex)errors.push('all CSS raw-hex debt increased: '+allRawHex+' > '+governance.limits.all_raw_hex);

const jsFiles=walk('web/src',p=>/\.(?:js|mjs)$/.test(p));
const injectors=jsFiles.filter(rel=>/createElement\(\s*['"]style['"]\s*\)/.test(read(rel)));
for(const rel of injectors)if(!governance.allowed_js_style_injectors.includes(rel))errors.push('unapproved JavaScript stylesheet injector: '+rel);
for(const rel of governance.allowed_js_style_injectors)if(!injectors.includes(rel))errors.push('stale JavaScript stylesheet exception; remove from governance: '+rel);
if(injectors.length>governance.limits.js_style_injectors)errors.push('JavaScript stylesheet injector debt increased: '+injectors.length+' > '+governance.limits.js_style_injectors);

const tokens=read('brand/tokens.css'),components=read('web/styles/components.css'),shell=read('web/src/ui/kona-shell.js'),landing=read('web/landing.template.html'),index=read('index.html'),system=read('web/styles/system.css'),harden=read('tools/harden_pages.mjs');
for(const token of ['--brand-sand','--brand-lava','--brand-ocean','--brand-sunrise','--brand-hibiscus','--brand-lilac','--brand-lime','--brand-font-ui','--brand-font-editorial','--brand-font-data','--brand-font-hand','--brand-mobile-gutter:20px'])if(!tokens.includes(token))errors.push('brand/tokens.css missing '+token);
for(const primitive of ['.btn-primary','.btn-secondary','.btn-text','.btn-icon','.ui-input','.ui-sheet'])if(!components.includes(primitive))errors.push('components.css missing '+primitive);
if(!/\[data-tab=home\]'\)\.onclick=routes\.home/.test(shell))errors.push('Home tab must invoke canonical Home, not Race Self');
if(!read('web/styles/studio.css').includes('--sand:var(--brand-bg)'))errors.push('Studio must consume brand tokens');
if(!read('web/styles/experience.css').includes('--accent:var(--brand-sunrise)'))errors.push('Experiences must consume brand accent');
if(!read('web/styles/collection.css').includes('font-family:var(--brand-font-ui)'))errors.push('Collection must consume brand typography');
if(/#appSheet[^\n]*var\(--safe-b\)/.test(system))errors.push('install sheet must not depend on museum safe-area variables');
if(!system.includes('env(safe-area-inset-bottom)'))errors.push('install sheet must use platform safe-area environment values');
if(!/family=Caveat:wght@500;600&family=Instrument\+Serif:ital@0;1&family=Manrope:wght@300\.\.800/.test(harden))errors.push('hardener must own the complete KONA font request through Manrope 800');
if((landing.match(/fonts\.googleapis\.com\/css2\?/g)||[]).length!==1)errors.push('landing must have exactly one Google Fonts stylesheet');

const expected=[...pageDesignLinks('index.html')];
const landingOrder=stylesheetLinks(landing);
const indexOrder=stylesheetLinks(index);
if(JSON.stringify(landingOrder)!==JSON.stringify(expected))errors.push('landing stylesheet order drift: '+landingOrder.join(' -> '));
if(JSON.stringify(indexOrder)!==JSON.stringify(expected))errors.push('generated index stylesheet order drift: '+indexOrder.join(' -> '));
if(!harden.includes("from './design-system-manifest.mjs'"))errors.push('hardener must consume design-system-manifest.mjs');

console.log('style governance inventory: '+discovered.length+' CSS authorities classified');
console.log('style debt ratchet: !important '+allImportant+'/'+governance.limits.all_important+' · raw hex '+allRawHex+'/'+governance.limits.all_raw_hex+' · consumer !important '+consumerImportant+'/'+governance.limits.consumer_important);
console.log('style observability: '+breakpoints.size+' breakpoint values · '+zIndexNumeric+' numeric z-index declarations · '+rawFontDeclarations+' raw font-family declarations · '+injectors.length+' JS stylesheet injector');
if(errors.length){console.error('brand authority gate failed');for(const e of errors)console.error(' - '+e);process.exit(1);}
console.log('brand authority gate: PASS ('+strict.length+' strict styles, '+discovered.length+' classified)');
