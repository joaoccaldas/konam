import { PRODUCT_META, PRODUCT_NAME } from '../product-meta.js';
export const inviteModel=()=>Object.freeze({title:PRODUCT_NAME+' · Race the version of yourself',text:'Meet me in '+PRODUCT_NAME+'. Build your athlete, choose your machine, explore Kona. No account needed.',url:PRODUCT_META.canonical_site});
export const whatsappInviteUrl=()=> 'https://wa.me/?text='+encodeURIComponent(inviteModel().text+' '+inviteModel().url);
export async function shareInvite(navigatorLike=globalThis.navigator){
  const model=inviteModel();
  try{
    if(typeof navigatorLike?.share==='function'){await navigatorLike.share(model);return{ok:true,method:'native'};}
    if(typeof navigatorLike?.clipboard?.writeText==='function'){await navigatorLike.clipboard.writeText(model.url);return{ok:true,method:'clipboard'};}
  }catch(error){return{ok:false,reason:error?.name==='AbortError'?'cancelled':'failed'};}
  return{ok:false,reason:'unsupported'};
}
