import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const rows=execFileSync('git',['ls-tree','-rl','HEAD'],{encoding:'utf8'}).trim().split('\n').filter(Boolean).map(line=>{
  const m=line.match(/^\d+\s+blob\s+([0-9a-f]+)\s+(\d+)\t(.+)$/);
  return m?{sha:m[1],size:Number(m[2]),path:m[3]}:null;
}).filter(Boolean);

const total=rows.reduce((n,r)=>n+r.size,0);
const groups=new Map();
for(const r of rows){if(!groups.has(r.sha))groups.set(r.sha,[]);groups.get(r.sha).push(r);}
const duplicates=[...groups.values()].filter(g=>g.length>1).sort((a,b)=>b[0].size*(b.length-1)-a[0].size*(a.length-1));
const top=[...rows].sort((a,b)=>b.size-a.size).slice(0,40);
const duplicateBytes=duplicates.reduce((n,g)=>n+g[0].size*(g.length-1),0);

console.log(JSON.stringify({
  files:rows.length,
  logical_bytes:total,
  exact_duplicate_groups:duplicates.length,
  exact_duplicate_extra_paths:duplicates.reduce((n,g)=>n+g.length-1,0),
  logical_duplicate_bytes:duplicateBytes,
  top_files:top,
  top_duplicate_groups:duplicates.slice(0,30).map(g=>({size:g[0].size,copies:g.length,paths:g.map(x=>x.path)}))
},null,2));
