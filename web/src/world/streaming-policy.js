export const ASSET_STATES=Object.freeze(['none','proxy','museum','hero','engineering']);

export function deviceBudget({memoryGB=4,cores=4,reducedData=false}={}){
 if(reducedData||memoryGB<=2||cores<=2) return 'low';
 if(memoryGB>=8&&cores>=6) return 'high';
 return 'medium';
}

export function assetPriority({distance=Infinity,visible=false,facing=false,currentRoom=false,intent='walk',costMB=1,budget='medium'}={}){
 const distanceScore=Math.max(0,40-Math.min(40,distance));
 const visibilityScore=visible?30:0;
 const facingScore=facing?12:0;
 const roomScore=currentRoom?18:0;
 const intentScore=intent==='inspect'?40:intent==='navigate'?10:0;
 const costPenalty=costMB*(budget==='low'?10:budget==='medium'?5:2);
 return distanceScore+visibilityScore+facingScore+roomScore+intentScore-costPenalty;
}

export function desiredLod({distance=Infinity,visible=false,currentRoom=false,intent='walk',budget='medium'}={}){
 if(intent==='inspect') return 'engineering';
 if(!currentRoom&&distance>30) return 'none';
 const scale=budget==='low'?0.75:budget==='high'?1.2:1;
 if(visible&&distance<6*scale) return 'hero';
 if((visible||currentRoom)&&distance<14*scale) return 'museum';
 if(distance<28*scale) return 'proxy';
 return 'none';
}

export function shouldRelease({distance=Infinity,currentRoom=false,secondsAway=0,budget='medium'}={}){
 const threshold=budget==='low'?24:budget==='high'?45:35;
 const cooldown=budget==='low'?3:budget==='high'?10:6;
 return !currentRoom&&distance>threshold&&secondsAway>=cooldown;
}
