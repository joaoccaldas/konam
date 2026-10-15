import test from 'node:test';
import assert from 'node:assert/strict';
import {isVibrationActivationNotice} from '../../tools/lib/browser-console-policy.mjs';
test('the observed Chrome activation notice is classified without weakening unrelated console errors',()=>{
  assert.equal(isVibrationActivationNotice("Blocked call to navigator.vibrate because user hasn't tapped on the frame or any embedded frame yet: https://www.chromestatus.com/feature/5644273861001216."),true);
  for(const message of ['navigator.vibrate is not a function','TypeError: room failed','Failed to load resource: 404','WebGL context lost','CERT failure',null])assert.equal(isVibrationActivationNotice(message),false);
});
