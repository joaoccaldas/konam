export const CAMERA_MODES=Object.freeze(['third-person','first-person']);
export function defaultCameraMode({coarsePointer=false}={}){
 return coarsePointer?'third-person':'first-person';
}
export function mobileGestureMap(){
 return Object.freeze({
  drag:'orbit',
  pinch:'zoom',
  tapGround:'move',
  tapObject:'select',
  twoFingerRotate:'heading',
  recenter:'follow-avatar',
 });
}
export function cameraPreferences({mode='third-person',distance=5.5,height=2.8}={}){
 const safeMode=CAMERA_MODES.includes(mode)?mode:'third-person';
 return {mode:safeMode,distance:Math.max(2.5,Math.min(10,distance)),height:Math.max(1.5,Math.min(6,height))};
}
