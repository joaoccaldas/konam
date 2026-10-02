import test from 'node:test';import assert from 'node:assert/strict';
import {installInstructions,installState} from '../src/engine/install-state.js';
test('Android with beforeinstallprompt uses native prompt',()=>{const s=installState({android:true,deferred:true});assert.equal(s.kind,'android-prompt');assert.equal(s.show,true);assert.equal(s.action,'prompt');assert.match(s.label,/Install KONA/);});
test('Android without prompt gets a truthful manual-install route',()=>{const s=installState({android:true});assert.equal(s.action,'instructions');assert.match(s.label,/Add KONA to phone/);assert.match(installInstructions(s.kind),/Install app|Add to Home screen/);});
test('iOS gets Add to Home Screen instructions',()=>{const s=installState({ios:true});assert.equal(s.action,'instructions');assert.match(installInstructions(s.kind),/Add to Home Screen/);});
test('installed app hides install',()=>assert.equal(installState({standalone:true}).show,false));
test('native container hides web install',()=>assert.equal(installState({native:true}).show,false));
test('generic browser prompt is used when available',()=>assert.equal(installState({deferred:true}).action,'prompt'));
test('unsupported browser still gets honest install help',()=>{const s=installState({});assert.equal(s.show,true);assert.equal(s.action,'instructions');assert.equal(s.label,'How to install');});
