// Bounded, opt-in observations of the existing renderer. No second render loop.
const median=values=>{const s=[...values].sort((a,b)=>a-b),m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2;};
export function summariseView(samples,context){
 if(!samples.length||samples.length>120)throw Error('Choose a bounded frame sample');
 const fields=['frameMs','cpuWorkMs','calls','triangles'];
 if(samples.some(s=>s.roomId!==context.roomId||fields.some(k=>!Number.isFinite(s[k])||s[k]<0)))throw Error('View changed or invalid sample');
 const summary=Object.fromEntries(fields.map(k=>{const v=samples.map(s=>s[k]).sort((a,b)=>a-b);return[k,{median:median(v),min:v[0],max:v.at(-1),p95:v[Math.ceil(v.length*.95)-1]}];}));
 return {schemaVersion:1,context,samples:samples.length,summary,cadenceFps:1000/Math.max(.001,summary.frameMs.median),gpuTimingAvailable:false,notice:'Local animation-frame cadence and CPU work; GPU completion, device acceptance and production quality are separate. No upload.'};
}
export function createViewSampler({frames=60,warmup=10}={}){
 if(!Number.isInteger(frames)||frames<10||frames>120||!Number.isInteger(warmup)||warmup<0||warmup>60)throw Error('Invalid view sample budget');
 let run=null;
 return {get active(){return !!run;},start(context){if(run)throw Error('A view sample is already active');return new Promise((resolve,reject)=>{run={context,resolve,reject,remaining:warmup,values:[]};});},
  observe(sample){if(!run)return;if(sample.roomId!==run.context.roomId){const previous=run;run=null;previous.reject(new Error('The view changed during measurement'));return;}
   if(run.remaining-->0)return;run.values.push(sample);if(run.values.length===frames){const previous=run;run=null;try{previous.resolve(summariseView(previous.values,previous.context));}catch(error){previous.reject(error);}}},
  cancel(){if(run){const previous=run;run=null;previous.reject(new Error('Measurement cancelled'));}}
 };
}
