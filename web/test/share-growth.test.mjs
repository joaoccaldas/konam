import test from 'node:test';import assert from 'node:assert/strict';
import {decodeShare,encodeShare} from '../src/quest.js';
import {shareRaceIdentity,shareUrl,whatsappShareUrl} from '../src/growth/share.js';
const draft={intent:'dreaming',bikeId:'canyon-cfr-2027',shoeId:'nike-alphafly-3-study',goal:'Sub-10'};
test('share token contains only allowlisted setup ids',()=>assert.deepEqual(decodeShare(encodeShare(draft)),draft));
test('invalid share tokens fail closed',()=>assert.equal(decodeShare('racing.evil.foo.nope'),null));
test('share URL opens same app and carries setup only',()=>{const u=shareUrl(draft,{origin:'https://example.test',pathname:'/app/'});assert.match(u,/^https:\/\/example\.test\/app\/\?kona=/);assert.equal(u.includes('email'),false);});
test('cancelled native share does not report success',async()=>{const nav={share:async()=>{const e=new Error('cancel');e.name='AbortError';throw e;}};const r=await shareRaceIdentity(draft,{navigatorLike:nav,locationLike:{origin:'https://x.test',pathname:'/'}});assert.equal(r.ok,false);assert.equal(r.reason,'cancelled');});
test('WhatsApp fallback is explicit and URL encoded',()=>assert.match(whatsappShareUrl(draft,{origin:'https://x.test',pathname:'/'}),/^https:\/\/wa\.me\/\?text=/));
