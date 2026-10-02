export function avatarProfile({id='guest',display='Visitor',style='placeholder',equipmentIds=[]}={}){
 return Object.freeze({schema:'avatar-profile-v1',id,display,style,equipmentIds:[...new Set(equipmentIds.filter(Boolean))]});
}
export function placeholderAvatarSpec(profile=avatarProfile()){
 return Object.freeze({
  profile,
  shape:'humanoid-capsule',
  opacity:.42,
  heightM:1.72,
  radiusM:.24,
  castsShadow:false,
  receivesShadow:false,
  interactive:false,
 });
}
