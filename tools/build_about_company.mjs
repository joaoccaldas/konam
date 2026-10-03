import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const src=path.join(root,'promo.html'),out=path.join(root,'about.html');
let html=fs.readFileSync(src,'utf8');

// about.html is a generated public alias of the Field Guide body. Keep one content authority.
html=html.replace(/<!--harden:start-->[\s\S]*?<!--harden:end-->\n?/,'');
html=html.split('\n').filter(line=>{
  if(/<meta name="robots"/.test(line))return false;
  if(/<link rel="canonical"/.test(line))return false;
  if(/<meta property="og:/.test(line))return false;
  if(/<meta name="twitter:/.test(line))return false;
  return true;
}).join('\n');
html=html.replace(/<title>[^<]*<\/title>/,'<title>About this company · Kona.m</title>');
html=html.replace(/<meta name="description" content="[^"]*">/,'<meta name="description" content="The origin, company history, Field Guide and tutorial map for Kona.m: from training log to 3D bikes, rooms, worlds and the island.">');
html=html.replace('FIELD GUIDE / INTERN EDITION','ABOUT / HISTORY / FIELD GUIDE');
html=html.replace('Skip to field guide','Skip to about and field guide');
html=html.replace(/https:\/\/joaoccaldas\.github\.io\/konam\/promo\.html/g,'https://joaoccaldas.github.io/konam/about.html');
html='<!-- GENERATED FROM promo.html BY tools/build_about_company.mjs · DO NOT EDIT BODY DIRECTLY -->\n'+html;
fs.writeFileSync(out,html);
console.log('about built from promo.html · '+Buffer.byteLength(html)+' bytes');
