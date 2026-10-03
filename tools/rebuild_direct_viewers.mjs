#!/usr/bin/env node
// Rebuild the six public direct bike viewers from existing canonical GLBs.
// No Blender step is required: geometry already lives in museum/catalog/canyon-assets.json.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const assets=JSON.parse(fs.readFileSync(path.join(root,'museum/catalog/canyon-assets.json'),'utf8')).glb;
const modern=[
  {asset:'cfr',profile:'museum/viewer-cfr.json',out:'Speedmax_Museum.html'},
  {asset:'slx',profile:'museum/viewer-slx.json',out:'Speedmax_SLX_Museum.html'},
];
const heritage=[
  {asset:'speedmax-three-2005',profile:'museum/viewer-speedmax-three-2005.json',out:'Speedmax_Three_2005_Museum.html'},
  {asset:'speedmax-2007',profile:'museum/viewer-speedmax-2007.json',out:'Speedmax_2007_Museum.html'},
  {asset:'speedmax-al-2011',profile:'museum/viewer-speedmax-al-2011.json',out:'Speedmax_AL_2011_Museum.html'},
  {asset:'speedmax-cf-2011',profile:'museum/viewer-speedmax-cf-2011.json',out:'Speedmax_CF_2011_Museum.html'},
];
const run=(file,entry)=>{
  const glb=assets[entry.asset];if(!glb)throw new Error('missing GLB registry entry '+entry.asset);
  execFileSync(process.execPath,[path.join(root,file)],{
    cwd:root,
    env:{...process.env,GLB:path.join(root,glb),BIKE_PROFILE:path.join(root,entry.profile),OUT_HTML:path.join(root,entry.out)},
    stdio:'inherit'
  });
};
for(const entry of modern)run('web/build.mjs',entry);
for(const entry of heritage)run('web/build_heritage.mjs',entry);
execFileSync(process.execPath,[path.join(root,'tools/harden_pages.mjs')],{cwd:root,stdio:'inherit'});
console.log('rebuilt direct viewers:',[...modern,...heritage].map(x=>x.out).join(', '));
