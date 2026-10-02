#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]||'_site');
if(!fs.existsSync(root)) throw new Error('staged public site not found: '+root);

const binaryExt=/\.(?:glb|png|jpe?g|webp|gif|ico|gz|woff2?|ttf|otf|wasm|mp4|mov|webm|mp3|zip)$/i;
const files=[];
const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else files.push(p)}};
walk(root);

const checks=[
  ['private-key',/BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/],
  ['github-token',/(?:ghp_|github_pat_)[A-Za-z0-9_]{30,}/],
  ['cloud-key',/(?:AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}|sk-[A-Za-z0-9_-]{20,})/],
  ['bearer-token',/Authorization:\s*Bearer\s+[A-Za-z0-9._-]{15,}/i],
  ['email-address',/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i],
  ['phone-link',/href=["']tel:/i],
  ['phone-field',/["'](?:telephone|phone|mobile)["']\s*:/i],
  ['local-machine-path',/\/(?:Users|home)\/[^/\s]+\//],
  ['private-contributor-name',/\b(?:Jo[aã]o\s+Caldas)\b/i],
  ['person-publisher',/"publisher"\s*:\s*\{[^{}]{0,300}"@type"\s*:\s*"Person"/i],
  ['person-author',/"(?:author|creator)"\s*:\s*\{[^{}]{0,300}"@type"\s*:\s*"Person"/i],
  ['html-author-meta',/<meta\s+[^>]*name=["']author["'][^>]*>/i],
];

const findings=[];
for(const abs of files){
  const rel=path.relative(root,abs).split(path.sep).join('/');
  if(binaryExt.test(rel)) continue;
  let text;try{text=fs.readFileSync(abs,'utf8')}catch{continue}
  text=text.replace(/data:[^;,\s]+;base64,[A-Za-z0-9+/=]+/g,'data:embedded-binary-removed');
  text=text.replace(/(["'`])[A-Za-z0-9+/]{256,}={0,2}\1/g,'$1embedded-binary-removed$1');
  const lines=text.split(/\r?\n/);
  lines.forEach((line,i)=>{
    for(const [kind,re] of checks)if(re.test(line))findings.push({rel,line:i+1,kind});
  });
}

if(findings.length){
  for(const f of findings)console.error(`${f.rel}:${f.line}: public-surface privacy violation: ${f.kind}`);
  process.exit(1);
}
console.log(`public-surface privacy PASS · ${files.length} staged files checked · no contributor name, email, phone, local path, Person publisher/author, or credential leak`);
