// cloud/supabase-lite.js — tiny dependency-free Supabase beta adapter.
//
// Uses only the public project URL + publishable key. Authorization is enforced by Postgres RLS.
// No service-role/secret key belongs in browser code.
import {readStorage,writeStorage,removeStorage} from '../engine/storage.js';
import { readGameState, writeGameState, GAME_STATE_SCHEMA_VERSION } from '../engine/game-state.js';

export const PUBLIC_SUPABASE_URL = 'https://mtvpnoqwjpoqaiocrklq.supabase.co';
export const PUBLIC_SUPABASE_KEY = 'sb_publishable_lVueu3GqNcPe4Z9KsChvJw_VfmnVi5u';
const URL = PUBLIC_SUPABASE_URL;
const KEY = PUBLIC_SUPABASE_KEY;

const json = async res => {
  const body = await res.text();
  let data = null; try { data = body ? JSON.parse(body) : null; } catch (_) {}
  if (!res.ok) throw Object.assign(new Error(data?.msg || data?.message || data?.error_description || 'Request failed'),{status:res.status,code:data?.error_code||data?.code});
  return data;
};
const baseHeaders = () => ({ apikey: KEY, 'Content-Type':'application/json' });
const session = () => { try { return JSON.parse(readStorage('session') || 'null'); } catch (_) { return null; } };
const saveSession = s => { try { s ? writeStorage('session', JSON.stringify(s)) : removeStorage('session'); } catch (_) {} };

let refreshing=null;
async function refresh() {
  if(refreshing)return refreshing;
  refreshing=refreshSession().finally(()=>{refreshing=null});
  return refreshing;
}
async function refreshSession() {
  const s = session();
  if (!s?.refresh_token) return null;
  const data = await json(await fetch(URL + '/auth/v1/token?grant_type=refresh_token', {
    method:'POST', headers:baseHeaders(), body:JSON.stringify({ refresh_token:s.refresh_token })
  }));
  saveSession(data); return data;
}
async function validSession() {
  let s = session();
  if (!s?.access_token) return null;
  const exp = Number(s.expires_at || 0) * 1000;
  if (exp && exp < Date.now() + 60000) s = await refresh().catch(() => null);
  return s;
}
async function authHeaders() {
  const s = await validSession();
  if (!s?.access_token) throw new Error('Sign in first');
  return { ...baseHeaders(), Authorization:'Bearer ' + s.access_token };
}

export function consumeAuthCallback() {
  const h = new URLSearchParams(location.hash.replace(/^#/, ''));
  if (!h.get('access_token')) return false;
  const now = Math.floor(Date.now()/1000);
  saveSession({
    access_token:h.get('access_token'),
    refresh_token:h.get('refresh_token'),
    token_type:h.get('token_type') || 'bearer',
    expires_in:Number(h.get('expires_in') || 3600),
    expires_at:Number(h.get('expires_at') || (now + Number(h.get('expires_in') || 3600))),
  });
  history.replaceState(null, '', location.pathname + location.search);
  return true;
}

// Success and throttling have different messages: a 429 does not prove an email was sent.
let otpPending=false;
const cooldownError=seconds=>Object.assign(new Error(`Please wait ${seconds}s before requesting another link. Check your inbox for any earlier link.`),{code:'rate_limited',retryAfter:seconds});
export async function sendMagicLink(email) {
  const clean=String(email||'').trim().toLowerCase();
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean))throw new Error('Enter a valid email');
  const remaining=Math.ceil((Number(readStorage('otpCooldown')||0)-Date.now())/1000);
  if(remaining>0)throw cooldownError(remaining);
  if(otpPending)throw new Error('A sign-in request is already in progress.');
  otpPending=true;
  try{
    const redirect=new globalThis.URL('index.html',location.href);redirect.search='';redirect.hash='';
    const res=await fetch(URL+'/auth/v1/otp?redirect_to='+encodeURIComponent(redirect.href),{
      method:'POST',headers:baseHeaders(),body:JSON.stringify({email:clean,create_user:true})
    });
    if(res.status===429){
      const seconds=Math.max(60,Number(res.headers.get('retry-after'))||60);
      writeStorage('otpCooldown',Date.now()+seconds*1000);
      throw Object.assign(new Error('Sign-in emails are temporarily limited. Please wait and try again; your local progress is still available.'),{code:'rate_limited',retryAfter:seconds});
    }
    const data=await json(res);writeStorage('otpCooldown',Date.now()+60000);return data;
  }finally{otpPending=false;}
}

export const isAdminUser = user => user?.app_metadata?.role === 'admin';

export async function currentUser() {
  const s = await validSession();
  if (!s?.access_token) return null;
  try {
    return await json(await fetch(URL + '/auth/v1/user', {
      headers:{ ...baseHeaders(), Authorization:'Bearer ' + s.access_token }
    }));
  } catch (error) { if(error.status===401||error.status===403)saveSession(null); return null; }
}

export async function signOut() {
  const s = await validSession();
  if (s?.access_token) {
    await fetch(URL + '/auth/v1/logout', { method:'POST', headers:{ ...baseHeaders(), Authorization:'Bearer ' + s.access_token } }).catch(() => {});
  }
  saveSession(null);
}

export async function backupGameState() {
  const user = await currentUser();
  if (!user?.id) throw new Error('Sign in first');
  const state = readGameState();
  const res = await fetch(URL + '/rest/v1/user_app_state?on_conflict=user_id', {
    method:'POST',
    headers:{ ...(await authHeaders()), Prefer:'resolution=merge-duplicates,return=representation' },
    body:JSON.stringify({ user_id:user.id, schema_version:GAME_STATE_SCHEMA_VERSION, state, updated_at:new Date().toISOString() })
  });
  return json(res);
}

export async function restoreGameState() {
  const user = await currentUser();
  if (!user?.id) throw new Error('Sign in first');
  const rows = await json(await fetch(URL + '/rest/v1/user_app_state?select=schema_version,state,updated_at&user_id=eq.' + encodeURIComponent(user.id), {
    headers:await authHeaders()
  }));
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row?.state) throw new Error('No cloud backup yet');
  if (Number(row.schema_version) !== GAME_STATE_SCHEMA_VERSION) throw new Error('Cloud state uses a newer schema');
  writeGameState(row.state);
  return row;
}

export function cloudAvailable() { return !!URL && !!KEY; }
