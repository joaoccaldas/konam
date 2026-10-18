import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePartnerRelease, REQUIRED} from '../../tools/partner-release-gate.mjs';

const complete=()=>({commit:'a'.repeat(40),previewUrl:'https://preview.example.com',
  checks:Object.fromEntries(REQUIRED.map(k=>[k,{status:'pass',evidence:'test-run-123/'+k}]))});
test('release gate refuses absent evidence',()=>assert.ok(validatePartnerRelease({}).length>0));
test('release gate refuses unpinned commit',()=>{const x=complete();x.commit='main';assert.match(validatePartnerRelease(x).join(' '),/pinned/);});
test('release gate refuses missing evidence even with pass flag',()=>{const x=complete();x.checks.pendingDenied.evidence='';assert.match(validatePartnerRelease(x).join(' '),/pendingDenied/);});
test('release gate refuses a failed authorization result',()=>{const x=complete();x.checks.directAssetDenied.status='fail';assert.match(validatePartnerRelease(x).join(' '),/directAssetDenied/);});
test('release gate refuses HTTP previews',()=>{const x=complete();x.previewUrl='http://preview.example.com';assert.match(validatePartnerRelease(x).join(' '),/HTTPS/);});
test('complete evidence passes schema check only',()=>assert.deepEqual(validatePartnerRelease(complete()),[]));
