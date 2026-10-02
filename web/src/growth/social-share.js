// growth/social-share.js — privacy-safe sharing for Progress and User Studio.
const cleanNumber=v=>Math.max(0,Number(v)||0);
export function safeAppUrl(locationLike=globalThis.location){
  const origin=String(locationLike?.origin||'');
  const pathname=String(locationLike?.pathname||'/');
  if(!/^https?:\/\//i.test(origin))return null;
  const url=new URL(origin+pathname);
  return url.toString();
}
export function progressShareModel(progress={}){
  return Object.freeze({
    level:Math.max(1,cleanNumber(progress.level)||1),
    levelName:String(progress.levelName||progress.level_name||'Visitor').slice(0,40),
    xp:cleanNumber(progress.xp),
    credits:cleanNumber(progress.credits),
    discoveries:cleanNumber(progress.stamps??progress.discoveries),
    badges:cleanNumber(progress.badges),
  });
}
export function progressShareText(progress={}){
  const p=progressShareModel(progress);
  return `KONA · Level ${p.level} ${p.levelName} · ${p.xp} XP · ${p.discoveries} discoveries. Apparently wandering is a training plan.`;
}
export function whatsappProgressUrl(progress,locationLike=globalThis.location){
  const url=safeAppUrl(locationLike);if(!url)return null;
  return 'https://wa.me/?text='+encodeURIComponent(progressShareText(progress)+' '+url);
}
const token=(name,fallback,doc=globalThis.document)=>{
  try{return getComputedStyle(doc.documentElement).getPropertyValue(name).trim()||fallback}catch(_){return fallback}
};
export async function progressCardBlob(progress,{documentLike=globalThis.document}={}){
  if(!documentLike?.createElement)return null;
  const p=progressShareModel(progress),c=documentLike.createElement('canvas');c.width=1080;c.height=1350;
  const g=c.getContext?.('2d');if(!g)return null;
  const bg=token('--brand-bg','#f4efe7',documentLike),ink=token('--brand-ink','#12181d',documentLike),action=token('--brand-action','#e8471c',documentLike),accent=token('--brand-discovery','#138a8f',documentLike),muted=token('--brand-muted','#5f6a72',documentLike);
  g.fillStyle=bg;g.fillRect(0,0,c.width,c.height);
  g.fillStyle=action;g.fillRect(72,72,150,12);
  g.fillStyle=ink;g.font='700 34px Manrope, system-ui, sans-serif';g.fillText('KONA · PROGRESS',72,150);
  g.font='400 126px "Instrument Serif", Georgia, serif';g.fillText('Level '+p.level,72,330);
  g.font='400 76px "Instrument Serif", Georgia, serif';g.fillText(p.levelName,72,420);
  const metrics=[['XP',p.xp],['KONA CREDITS',p.credits],['DISCOVERIES',p.discoveries],['BADGES',p.badges]];
  metrics.forEach(([label,value],i)=>{const y=570+i*145;g.fillStyle=i%2?accent:action;g.font='800 28px Manrope, system-ui, sans-serif';g.fillText(label,72,y);g.fillStyle=ink;g.font='400 66px "Instrument Serif", Georgia, serif';g.fillText(String(value),72,y+68);});
  g.fillStyle=muted;g.font='500 28px Manrope, system-ui, sans-serif';g.fillText('Apparently wandering is a training plan.',72,1245);
  return new Promise(resolve=>{if(typeof c.toBlob==='function')c.toBlob(resolve,'image/png');else resolve(null);});
}
export async function shareProgress(progress,{navigatorLike=globalThis.navigator,locationLike=globalThis.location,documentLike=globalThis.document,FileCtor=globalThis.File}={}){
  const url=safeAppUrl(locationLike);if(!url)return{ok:false,reason:'invalid-url'};
  const text=progressShareText(progress),blob=await progressCardBlob(progress,{documentLike});
  try{
    if(blob&&FileCtor&&typeof navigatorLike?.canShare==='function'&&typeof navigatorLike?.share==='function'){
      const file=new FileCtor([blob],'kona-progress.png',{type:'image/png'});
      if(navigatorLike.canShare({files:[file]})){await navigatorLike.share({files:[file],title:'My KONA progress',text,url});return{ok:true,method:'native-file',url};}
    }
    if(typeof navigatorLike?.share==='function'){await navigatorLike.share({title:'My KONA progress',text,url});return{ok:true,method:'native',url};}
    if(typeof navigatorLike?.clipboard?.writeText==='function'){await navigatorLike.clipboard.writeText(text+' '+url);return{ok:true,method:'clipboard',url};}
  }catch(error){if(error?.name==='AbortError')return{ok:false,reason:'cancelled',url};return{ok:false,reason:'share-failed',url};}
  return{ok:false,reason:'unsupported',url};
}
