// Repository privacy gate: every tracked file in the public repository.
// Patterns live in tools/lib/privacy-patterns.mjs (single authority).
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { decodeForScan, SECRET_PATTERNS, PERSONAL_PATTERNS, loadExceptions, isExcepted } from './lib/privacy-patterns.mjs';

const files=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const binaryExt=/\.(?:glb|blend|png|jpe?g|webp|gif|ico|gz|apk|woff2?|ttf|otf|wasm|pdf|mp4|mov|webm|mp3|zip)$/i;
// Files that define the patterns themselves (or test them) would otherwise match by definition.
const definitionFiles=new Set(['.github/workflows/release-security.yml','tools/scan_private_data.mjs','tools/scan_public_surface.mjs','tools/lib/privacy-patterns.mjs','config/privacy-exceptions.json','web/test/privacy-scanners.test.mjs']);
const exceptions=loadExceptions();
const used=new Set();
const findings=[];
for(const file of files){
  if(binaryExt.test(file) || definitionFiles.has(file)) continue;
  let text; try{text=fs.readFileSync(file,'utf8')}catch{continue}
  // Embedded data URLs are binary payloads represented as text. Scan the surrounding HTML/JS,
  // but remove the opaque payload itself to avoid random base64 matching credential patterns.
  text=text.replace(/data:[^;,\s]+;base64,[A-Za-z0-9+/=]+/g,'data:embedded-binary-removed');
  // Some generated standalone museum pages embed GLB bytes as a very long quoted
  // base64 literal rather than a data: URL. Treat those opaque bytes like binary files;
  // secrets remain detectable in all surrounding executable/source text.
  text=text.replace(/(["'`])[A-Za-z0-9+/]{256,}={0,2}\1/g,'$1embedded-binary-removed$1');
  text.split(/\r?\n/).forEach((raw,i)=>{
    // Deployment leak guards contain the same patterns by definition. Do not flag
    // that one scanner-definition line as if it were a leaked value.
    if(['.github/workflows/pages.yml','.github/workflows/publish-public-pages.yml'].includes(file) && /grep\s+-rIlE/.test(raw)) return;
    const line=decodeForScan(raw);
    for(const [kind,re] of [...SECRET_PATTERNS,...PERSONAL_PATTERNS]){
      if(!re.test(line)) continue;
      const ex=exceptions.find(e=>isExcepted([e],{file,kind,line,re}));
      if(ex){used.add(ex);continue;}
      findings.push({file,line:i+1,kind});
    }
  });
}
for(const e of exceptions) if(!used.has(e)) findings.push({file:'config/privacy-exceptions.json',line:0,kind:`unused-exception:${e.file}:${e.kind}`});
if(findings.length){
  for(const f of findings) console.error(`${f.file}:${f.line}: ${f.kind}`);
  process.exit(1);
}
console.log(`private-data scan PASS · ${files.length} tracked files checked · ${exceptions.length} declared exception(s)`);
