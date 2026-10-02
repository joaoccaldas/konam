import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIRS = ['web/src','tools','integrations'];
const LEGACY_SPEEDMAX_ALLOWLIST = new Set([
  'web/src/engine/profile.js','web/src/engine/app-state.js','web/src/engine/game-state.js',
  'web/src/finds.js','web/src/engine/identity.js','web/src/engine/progression.js',
  'web/src/exp/main.js','web/src/main.js','web/src/passport.js','web/src/landing.js',
  'web/src/studio/race-setup.js','tools/harden_pages.mjs','web/src/engine/storage.js',
]);
const errors = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out=[];
  for (const ent of fs.readdirSync(dir,{withFileTypes:true})) {
    const p=path.join(dir,ent.name);
    if (ent.isDirectory()) out.push(...walk(p)); else out.push(p);
  }
  return out;
}

const textFiles=SOURCE_DIRS.flatMap(d=>walk(path.join(ROOT,d))).filter(p=>/\.(js|mjs|json|md|css|html|yml|yaml|py)$/.test(p));
if(textFiles.length<25) errors.push(`guard scanned suspiciously few source files: ${textFiles.length}`);

for(const file of textFiles){
 const rel=path.relative(ROOT,file).replaceAll('\\','/');
 const text=fs.readFileSync(file,'utf8');
 if(/\/Users\/[^/]+\//.test(text)||/C:\\Users\\/i.test(text)) errors.push(`${rel}: contains a private absolute user path`);
 if(rel!=='web/src/engine/storage.js' && /['"`]speedmax\.[A-Za-z0-9_.:-]+['"`]/.test(text) && !LEGACY_SPEEDMAX_ALLOWLIST.has(rel))
   errors.push(`${rel}: new direct legacy speedmax.* key; use the KONA storage adapter`);
}

// Styling authority guard: no published page may load the same local stylesheet twice.
// Consumer-only CSS must never leak back into standalone 3D/editorial pages.
const PAGE_FILES = [
  'index.html','Studio.html','Experiences.html','Canyon_Collection.html',
  'web/landing.template.html','web/studio.template.html','web/experience.template.html'
].filter(f=>fs.existsSync(path.join(ROOT,f)));
for (const rel of PAGE_FILES) {
  const html=fs.readFileSync(path.join(ROOT,rel),'utf8');
  const hrefs=[...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi)].map(m=>m[1]);
  const dup=[...new Set(hrefs.filter((h,i)=>hrefs.indexOf(h)!==i))];
  if(dup.length) errors.push(`${rel}: duplicate stylesheet links: ${dup.join(', ')}`);
  if(rel!=='index.html' && rel!=='web/landing.template.html' && /web\/styles\/(?:shell-mobile|race-self)\.css/.test(html))
    errors.push(`${rel}: consumer-only shell/Race Self CSS leaked into standalone page`);
}
const shellCss=fs.readFileSync(path.join(ROOT,'web/styles/shell-mobile.css'),'utf8');
if(/\.race-self-|\.hub-drawer|\.avatar-options/.test(shellCss))
  errors.push('web/styles/shell-mobile.css: Race Self styles must live only in web/styles/race-self.css');
for(const banned of ['downloads/SpeedmaxMuseum.apk']) if(fs.existsSync(path.join(ROOT,banned))) errors.push(`${banned}: release binary belongs in Actions/Releases`);

if(errors.length){console.error('repository hygiene guard failed');for(const e of errors)console.error(' - '+e);process.exit(1);}
console.log(`repository hygiene guard: PASS (${textFiles.length} source files checked; ${LEGACY_SPEEDMAX_ALLOWLIST.size} legacy-key files grandfathered for migration)`);
