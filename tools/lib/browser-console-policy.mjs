// Chrome reports this refused optional haptic at console-error severity.
// Preserve it as a policy warning; do not hide other vibration/runtime failures.
export function isVibrationActivationNotice(message){
  return typeof message==='string'&&/^Blocked call to navigator\.vibrate because user hasn't tapped on the frame or any embedded frame yet: https:\/\/www\.chromestatus\.com\/feature\/5644273861001216\.?$/.test(message);
}
