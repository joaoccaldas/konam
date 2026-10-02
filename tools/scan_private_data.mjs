import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const files=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const binaryExt=/\.(?:glb|blend|png|jpe?g|webp|gif|ico|gz|apk|woff2?|ttf|otf|wasm|pdf|mp4|mov|webm|mp3|zip)$/i;
const secretPatterns=[
  /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/,
  /ghp_[A-Za-z0-9]{30,}/,
  /github_pat_[A-Za-z0-9_]{40,}/,
  /AKIA[0-9A-Z]{16}/,
  /AIza[0-9A-Za-z_-]{35}/,
  /sk-[A-Za-z0-9_-]{20,}/,
  /Authorization:\s*Bearer\s+[A-Za-z0-9._-]{15,}/,
  /[A-Za-z0-9._%+-]+@(gmail|hotmail|outlook|icloud|yahoo)\.com/i,
];
const localPath=/\/(?:Users|home)\/[^/\s]+\//;
const findings=[];
for(const file of files){
  if(binaryExt.test(file) || file==='.github/workflows/release-security.yml' || file==='tools/scan_private_data.mjs') continue;
  let text; try{text=fs.readFileSync(file,'utf8')}catch{continue}
  // Embedded data URLs are binary payloads represented as text. Scan the surrounding HTML/JS,
  // but remove the opaque payload itself to avoid random base64 matching credential patterns.
  text=text.replace(/data:[^;,\s]+;base64,[A-Za-z0-9+/=]+/g,'data:embedded-binary-removed');
  // Some generated standalone museum pages embed GLB bytes as a very long quoted
  // base64 literal rather than a data: URL. Treat those opaque bytes like binary files;
  // secrets remain detectable in all surrounding executable/source text.
  text=text.replace(/(["'`])[A-Za-z0-9+/]{256,}={0,2}\1/g,'$1embedded-binary-removed$1');
  const lines=text.split(/\r?\n/);
  lines.forEach((line,i)=>{
    // Deployment leak guards contain the same patterns by definition. Do not flag
    // that one scanner-definition line as if it were a leaked value.
    const selfReferentialGuard = file==='.github/workflows/pages.yml' && /grep\s+-rIlE/.test(line);
    if(!selfReferentialGuard && secretPatterns.some(re=>re.test(line))) findings.push({file,line:i+1,kind:'secret/private-data'});
    if(!selfReferentialGuard && localPath.test(line)) findings.push({file,line:i+1,kind:'local-machine-path'});
  });
}
if(findings.length){
  for(const f of findings) console.error(`${f.file}:${f.line}: ${f.kind}`);
  process.exit(1);
}
console.log(`private-data scan PASS · ${files.length} tracked files checked`);
