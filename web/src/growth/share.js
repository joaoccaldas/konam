import { encodeShare, questLabels } from '../quest.js';

export function shareUrl(draft, locationLike=globalThis.location){
 const token=encodeShare(draft); if(!token) return null;
 const url=new URL(locationLike.origin+locationLike.pathname);url.searchParams.set('kona',token);return url.toString();
}

export async function shareRaceIdentity(draft,{navigatorLike=globalThis.navigator,locationLike=globalThis.location}={}){
 const url=shareUrl(draft,locationLike); if(!url) return {ok:false,reason:'invalid-identity'};
 const labels=questLabels(draft);
 const data={title:'My Kona',text:`${labels.bike} · ${labels.shoe} · ${labels.goal}. Build yours.`,url};
 try{
   if(typeof navigatorLike?.share==='function'){await navigatorLike.share(data);return{ok:true,method:'native',url};}
   if(typeof navigatorLike?.clipboard?.writeText==='function'){await navigatorLike.clipboard.writeText(url);return{ok:true,method:'clipboard',url};}
 }catch(err){if(err?.name==='AbortError') return{ok:false,reason:'cancelled',url};return{ok:false,reason:'share-failed',url};}
 return{ok:false,reason:'unsupported',url};
}

export function whatsappShareUrl(draft,locationLike=globalThis.location){
 const url=shareUrl(draft,locationLike); if(!url) return null;
 const labels=questLabels(draft);
 return 'https://wa.me/?text='+encodeURIComponent(`My Kona: ${labels.bike} · ${labels.goal}. Build yours: ${url}`);
}
