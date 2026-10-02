import test from 'node:test';import assert from 'node:assert/strict';
import {avatarProfile,placeholderAvatarSpec} from '../src/world/avatar-profile.js';
import {cameraPreferences,defaultCameraMode,mobileGestureMap} from '../src/world/mobile-camera.js';
test('mobile defaults to third person',()=>assert.equal(defaultCameraMode({coarsePointer:true}),'third-person'));
test('desktop may retain first person',()=>assert.equal(defaultCameraMode({coarsePointer:false}),'first-person'));
test('mobile gestures use familiar orbit zoom tap model',()=>assert.deepEqual(mobileGestureMap(),{drag:'orbit',pinch:'zoom',tapGround:'move',tapObject:'select',twoFingerRotate:'heading',recenter:'follow-avatar'}));
test('placeholder is translucent and noninteractive',()=>{const x=placeholderAvatarSpec();assert.ok(x.opacity>0&&x.opacity<1);assert.equal(x.interactive,false);});
test('avatar equipment ids deduplicate for future RaceIdentity integration',()=>assert.deepEqual(avatarProfile({equipmentIds:['a','a','b']}).equipmentIds,['a','b']));
test('camera bounds prevent absurd mobile zoom',()=>assert.deepEqual(cameraPreferences({distance:99,height:-2}),{mode:'third-person',distance:10,height:1.5}));
