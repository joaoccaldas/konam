#!/usr/bin/env node
/** Reproducible skill inventory. A SKILL.md is evidence of instructions, not execution. */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
export function inventorySkills(roots, {exists=fs.existsSync,read=fs.readFileSync,readdir=fs.readdirSync}={}) {
 const rows=[];
 function walk(dir,repo,root) {
  if(!exists(dir))return;
  for(const entry of readdir(dir,{withFileTypes:true})) {
   if(entry.name.startsWith('.')||entry.name==='node_modules')continue;
   const full=path.join(dir,entry.name);
   if(entry.isDirectory())walk(full,repo,root);
   else if(entry.isFile() && entry.name==='SKILL.md') {
    const raw=read(full,'utf8'), front=raw.match(/^---\s*\n([\s\S]*?)\n---(?:\n|$)/);
    const field=(key)=>front?.[1].match(new RegExp('^'+key+':\\s*(.+)$','m'))?.[1]?.replace(/^["']|["']$/g,'')?.trim()||null;
    const issues=[];
    if(!front)issues.push('missing-frontmatter');
    if(!field('name'))issues.push('missing-name');
    if(!field('description'))issues.push('missing-description');
    if(!/(test|validat|acceptance|check)/i.test(raw))issues.push('no-validation-instructions');
    rows.push({repository:repo,source:path.relative(root,full).split(path.sep).join('/'),
       name:field('name'),description:field('description'),status:'documented-not-execution-verified',issues});
   }
  }
 }
 for(const {repository,root,skillsPath} of roots)walk(path.join(root,skillsPath),repository,root);
 rows.sort((a,b)=>a.repository.localeCompare(b.repository)||a.source.localeCompare(b.source));
 const names=new Map();
 for(const row of rows){if(!row.name)continue;const prior=names.get(row.name);if(prior){row.issues.push('duplicate-name:'+prior);const other=rows.find(x=>x.repository+':'+x.source===prior);other?.issues.push('duplicate-name:'+row.repository+':'+row.source);}else names.set(row.name,row.repository+':'+row.source);}
 return {schema_version:1,kind:'skill-discovery-projection',meaning:'Instructions discovered; no execution success is implied',
   count:rows.length,issues:rows.reduce((n,r)=>n+r.issues.length,0),skills:rows};
}
export function main(args=process.argv.slice(2)) {
 if(args.length<1)throw Error('usage: node tools/skills-inventory.mjs <repo-name=absolute-or-relative-path> [...]');
 const roots=args.map(a=>{const i=a.indexOf('=');if(i<1)throw Error('Expected repo=path');return {repository:a.slice(0,i),root:path.resolve(a.slice(i+1)),skillsPath:'skills'};});
 process.stdout.write(JSON.stringify(inventorySkills(roots),null,2)+'\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main();
