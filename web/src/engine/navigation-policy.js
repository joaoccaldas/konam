// engine/navigation-policy.js — stable primary navigation contract.
//
// The five durable destinations stay visible for every user.
// Progressive disclosure belongs inside those surfaces, never in the map itself.

export const NAV_ORDER=Object.freeze(['home','discover','garage','plan','me']);

export function navigationForState(){
  return [...NAV_ORDER];
}

export function navigationVisibility(){
  return Object.freeze(Object.fromEntries(NAV_ORDER.map(id=>[id,true])));
}
