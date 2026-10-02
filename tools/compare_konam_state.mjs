#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const baseline=JSON.parse(fs.readFileSync(path.join(ROOT,'world/konam/pre-migration-baseline-v1.json'),'utf8'));
const base=process.env.KONAM_BASE_SHA || baseline.source_sha;
const outDir=path.join(ROOT,process.env.KONAM_EVIDENCE_DIR || 'konam-comparison-evidence');
fs.mkdirSync(outDir,{recursive:true});

const git=(args,opts={})=>execFileSync('git',args,{cwd:ROOT,encoding:'utf8',...opts}).trim();
const show=(ref,file)=>{
  try{return execFileSync('git',['show',ref+':'+file],{cwd:ROOT,encoding:'utf8'});}catch{return null;}
};
const exists=p=>fs.existsSync(path.join(ROOT,p));
const current=p=>exists(p)?fs.readFileSync(path.join(ROOT,p),'utf8'):null;
const lines=s=>s==null?null:s.split('\n').length;
const count=(s,re)=>s==null?null:(s.match(re)||[]).length;
const sha=p=>{try{return git(['hash-object',p])}catch{return null}};

let changed=[];
try{changed=git(['diff','--name-only',base+'...HEAD']).split('\n').filter(Boolean);}catch(e){
  console.error('Unable to compare against '+base+'. Ensure checkout fetch-depth is 0.');
  process.exit(2);
}
const buckets={
  runtime:[],generated:[],product_data:[],docs:[],tests:[],dependencies:[],workflows:[],other:[]
};
const generatedPatterns=[/^app\//,/^sw\.js$/,/^web\/dist\//,/\.html$/];
for(const f of changed){
  if(/^\.github\/workflows\//.test(f)) buckets.workflows.push(f);
  else if(/package(?:-lock)?\.json$/.test(f)) buckets.dependencies.push(f);
  else if(/^web\/test\//.test(f)||/\.test\.[mc]?js$/.test(f)||/^tools\/(?:compare_konam_state|validate_konam_world)\.mjs$/.test(f)) buckets.tests.push(f);
  else if(/^world\/konam\//.test(f)||/^collections\//.test(f)||/^quests\//.test(f)) buckets.product_data.push(f);
  else if(/^docs\//.test(f)) buckets.docs.push(f);
  else if(generatedPatterns.some(re=>re.test(f))) buckets.generated.push(f);
  else if(/^web\/src\//.test(f)||/^web\/styles\//.test(f)||/^integrations\//.test(f)||/^supabase\//.test(f)||/^tools\//.test(f)) buckets.runtime.push(f);
  else buckets.other.push(f);
}

const protectedFiles=[
  'web/src/landing.js','web/src/ui/kona-shell.js','manifest.webmanifest',
  '.github/workflows/checks.yml','.github/workflows/release-security.yml',
  '.github/workflows/integration-contract.yml','.github/workflows/ui-interaction-audit.yml',
  '.github/workflows/visual-evidence-v2.yml'
];
const protectedDiff=protectedFiles.filter(f=>changed.includes(f));

const packageFiles=['web/package.json','app/native/package.json'];
const dependencyDelta={};
for(const p of packageFiles){
  const beforeRaw=show(base,p), afterRaw=current(p);
  if(!beforeRaw||!afterRaw){dependencyDelta[p]={missing:true};continue}
  const b=JSON.parse(beforeRaw), a=JSON.parse(afterRaw);
  const flatten=o=>({...o.dependencies||{},...o.devDependencies||{}});
  const bd=flatten(b), ad=flatten(a);
  const added=Object.keys(ad).filter(k=>!(k in bd)).map(k=>[k,ad[k]]);
  const removed=Object.keys(bd).filter(k=>!(k in ad)).map(k=>[k,bd[k]]);
  const changedVersions=Object.keys(ad).filter(k=>k in bd&&ad[k]!==bd[k]).map(k=>[k,bd[k],ad[k]]);
  dependencyDelta[p]={added,removed,changed:changedVersions};
}

const metricFiles=['web/src/landing.js','web/src/ui/kona-shell.js','tools/repo-hygiene.mjs','tools/scan_private_data.mjs'];
const metrics={};
for(const p of metricFiles){
  const b=show(base,p), a=current(p);
  metrics[p]={
    before:{exists:b!=null,chars:b?.length??null,lines:lines(b),innerHTML:count(b,/innerHTML/g),localStorage:count(b,/localStorage/g),eval:count(b,/\beval\(/g),documentWrite:count(b,/document\.write/g)},
    after:{exists:a!=null,chars:a?.length??null,lines:lines(a),innerHTML:count(a,/innerHTML/g),localStorage:count(a,/localStorage/g),eval:count(a,/\beval\(/g),documentWrite:count(a,/document\.write/g)}
  };
}

const shell=current('web/src/ui/kona-shell.js')||'';
const requiredRoutes=['home','discover','garage','plan','me'];
const missingRoutes=requiredRoutes.filter(r=>!new RegExp("data-tab=[\\\"']"+r+"[\\\"']").test(shell));
const releaseControls=[
  '.github/workflows/checks.yml',
  '.github/workflows/release-security.yml',
  '.github/workflows/integration-contract.yml',
  '.github/workflows/ui-interaction-audit.yml',
  '.github/workflows/visual-evidence-v2.yml'
];
const missingControls=releaseControls.filter(f=>!exists(f));

const speedmaxNow=[];
for(const p of ['web/src/engine/profile.js','web/src/engine/app-state.js','web/src/engine/game-state.js','web/src/finds.js','web/src/engine/identity.js','web/src/engine/progression.js','web/src/exp/main.js','web/src/main.js','web/src/passport.js','web/src/landing.js','web/src/studio/race-setup.js','tools/harden_pages.mjs','web/src/engine/storage.js']){
  const t=current(p); if(t) speedmaxNow.push([p,count(t,/['"`]speedmax\.[A-Za-z0-9_.:-]+['"`]/g)||0]);
}
const legacySpeedmaxReferences=speedmaxNow.reduce((a,[,n])=>a+n,0);
let legacySpeedmaxBefore=0;
for(const p of ['web/src/engine/profile.js','web/src/engine/app-state.js','web/src/engine/game-state.js','web/src/finds.js','web/src/engine/identity.js','web/src/engine/progression.js','web/src/exp/main.js','web/src/main.js','web/src/passport.js','web/src/landing.js','web/src/studio/race-setup.js','tools/harden_pages.mjs','web/src/engine/storage.js']){
  const t=show(base,p); if(t) legacySpeedmaxBefore += count(t,/['"`]speedmax\.[A-Za-z0-9_.:-]+['"`]/g)||0;
}

const changeContractChanged=changed.includes('docs/KONAM_CHANGE_CONTRACT.md');

const report={
  schema_version:1,base_sha:base,head_sha:git(['rev-parse','HEAD']),
  changed_files:changed.length,buckets,protected_files_changed:protectedDiff,
  dependency_delta:dependencyDelta,metrics,
  flow_contract:{required_route_ids:requiredRoutes,missing_route_ids:missingRoutes},
  safety_contract:{missing_release_controls:missingControls,legacy_speedmax_direct_key_references_before:legacySpeedmaxBefore,legacy_speedmax_direct_key_references_after:legacySpeedmaxReferences},
  policy:{
    change_contract_changed:changeContractChanged,
    runtime_changes:buckets.runtime,
    dependency_changes:buckets.dependencies
  }
};

const problems=[];
if(missingRoutes.length) problems.push('canonical route IDs disappeared: '+missingRoutes.join(', '));
if(missingControls.length) problems.push('required release controls missing: '+missingControls.join(', '));
if(buckets.runtime.length && !changeContractChanged)
  problems.push('runtime/source files changed without updating docs/KONAM_CHANGE_CONTRACT.md: '+buckets.runtime.join(', '));
const depChanged=Object.values(dependencyDelta).some(x=>(x.added?.length||0)||(x.removed?.length||0)||(x.changed?.length||0));
if(depChanged && !changeContractChanged)
  problems.push('dependency graph changed without updating docs/KONAM_CHANGE_CONTRACT.md');
if(legacySpeedmaxReferences>legacySpeedmaxBefore)
  problems.push('new direct legacy speedmax.* references were added ('+legacySpeedmaxBefore+' → '+legacySpeedmaxReferences+')');
for(const [p,m] of Object.entries(metrics)){
  if((m.after.eval||0)>(m.before.eval||0)) problems.push(p+': eval() usage increased');
  if((m.after.documentWrite||0)>(m.before.documentWrite||0)) problems.push(p+': document.write usage increased');
}
report.problems=problems;

fs.writeFileSync(path.join(outDir,'comparison.json'),JSON.stringify(report,null,2)+'\n');
const md=[
 '# Kona.m before/after comparison','',
 `Base: \`${report.base_sha}\``,`Head: \`${report.head_sha}\``,'',
 '## Change surface','',
 ...Object.entries(buckets).map(([k,v])=>`- **${k}**: ${v.length}${v.length?' — '+v.join(', '):''}`),'',
 '## Protected runtime / release files','',
 protectedDiff.length?protectedDiff.map(x=>'- CHANGED: '+x).join('\n'):'No protected file changed.','',
 '## Dependencies','',
 ...Object.entries(dependencyDelta).map(([p,d])=>`- **${p}**: +${d.added?.length||0} / -${d.removed?.length||0} / Δ${d.changed?.length||0}`),'',
 '## Flow and safety','',
 `- Missing canonical route IDs: ${missingRoutes.length?missingRoutes.join(', '):'none'}`,
 `- Missing release/security controls: ${missingControls.length?missingControls.join(', '):'none'}`,
 `- Direct legacy speedmax.* references: ${legacySpeedmaxBefore} → ${legacySpeedmaxReferences}`,'',
 '## Result','',
 problems.length?problems.map(x=>'- FAIL: '+x).join('\n'):'PASS: compared state preserves declared pre-migration runtime/dependency/flow boundaries.'
].join('\n');
fs.writeFileSync(path.join(outDir,'comparison.md'),md+'\n');
console.log(md);
if(problems.length) process.exit(1);
