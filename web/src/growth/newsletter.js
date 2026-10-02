import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_KEY } from '../cloud/supabase-lite.js';

const ENDPOINT=PUBLIC_SUPABASE_URL+'/functions/v1/newsletter-subscribe';
const cleanEmail=value=>String(value||'').trim().toLowerCase();

export async function subscribeNewsletter(email,{source='user-studio',locale=document.documentElement.lang||'en',company=''}={}){
  const normalized=cleanEmail(email);
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized))throw new Error('Enter a valid email address.');
  const response=await fetch(ENDPOINT,{
    method:'POST',
    headers:{apikey:PUBLIC_SUPABASE_KEY,'Content-Type':'application/json'},
    body:JSON.stringify({email:normalized,source,locale,company}),
  });
  let data={};try{data=await response.json();}catch{}
  if(!response.ok)throw Object.assign(new Error(data.error||'Newsletter signup is unavailable right now.'),{status:response.status});
  return data;
}
