// Pure, opt-in adaptive resolution policy. Does not construct a renderer or touch DOM.
// Pass measured frame times from a real active render loop; pause sampling in background tabs.
export function createFrameBudget({
 targetMs=1000/30, minScale=0.65, maxScale=1, initialScale=1,
 windowSize=90, cooldownWindows=2, downThreshold=1.20, upThreshold=0.78,
 maxPixelCount=2_000_000,
}={}){
 const finite=(x)=>typeof x==='number'&&Number.isFinite(x);
 if(![targetMs,minScale,maxScale,initialScale,downThreshold,upThreshold,maxPixelCount].every(finite)||
 targetMs<=0||minScale<=0||maxScale<minScale||initialScale<minScale||initialScale>maxScale||
 !Number.isInteger(windowSize)||windowSize<8||!Number.isInteger(cooldownWindows)||cooldownWindows<0||
 upThreshold<=0||downThreshold<=upThreshold||maxPixelCount<1)throw new TypeError('invalid frame budget configuration');
 let scale=initialScale,cooldown=0,samples=[],last=null;
 function observe(ms){
  if(!finite(ms)||ms<=0||ms>1000)return {scale,changed:false,reason:'invalid-sample'};
  samples.push(ms);
  if(samples.length<windowSize)return {scale,changed:false,reason:'sampling'};
  const sorted=samples.sort((a,b)=>a-b);
  const p95=sorted[Math.ceil(sorted.length*.95)-1];
  samples=[];last=p95;
  if(cooldown>0){cooldown--;return {scale,changed:false,reason:'cooldown',p95}};
  const before=scale;
  if(p95>targetMs*downThreshold)scale=Math.max(minScale,Math.round((scale-.10)*100)/100);
  else if(p95<targetMs*upThreshold)scale=Math.min(maxScale,Math.round((scale+.05)*100)/100);
  if(scale!==before)cooldown=cooldownWindows;
  return {scale,changed:scale!==before,reason:scale<before?'decrease':scale>before?'increase':'stable',p95};
 }
 function pixelRatio({width,height,devicePixelRatio=1}){
  if(![width,height,devicePixelRatio].every(finite)||width<=0||height<=0||devicePixelRatio<=0)throw new TypeError('invalid viewport');
  const cap=Math.sqrt(maxPixelCount/(width*height));
  return Math.min(devicePixelRatio*scale,cap,devicePixelRatio);
 }
 return Object.freeze({observe,pixelRatio,get scale(){return scale},get lastP95(){return last},reset(){scale=initialScale;cooldown=0;samples=[];last=null;}});
}
