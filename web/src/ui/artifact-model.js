const TYPE_LABELS=Object.freeze({bike:'Race machine',shoe:'Running shoe',helmet:'Helmet',watch:'Watch',wheel:'Wheel',wetsuit:'Wetsuit',component:'Component',memorabilia:'Memorabilia',artifact:'Artifact'});

export function artifactViewModel(product){
 if(!product?.id||!product?.name) throw new Error('Artifact requires stable id and name');
 const facts=Array.isArray(product.facts)?product.facts.filter(x=>x?.text).slice(0,3):[];
 const sources=Array.isArray(product.sources)?product.sources.filter(x=>x?.url||x?.file):[];
 return Object.freeze({
  id:product.id,
  eyebrow:`ARTIFACT · ${TYPE_LABELS[product.type]||'Artifact'}`,
  title:product.name,
  meta:[product.year||product.years,product.category,product.brand].filter(Boolean).join(' · '),
  hero:product.glb?{kind:'3d',src:product.glb}:product.image?{kind:'image',src:product.image}:null,
  facts:facts.map(x=>x.text),
  material:product.material||null,
  sources,
  actions:{
   inspect:Boolean(product.glb),
   garage:true,
   compare:['bike','shoe','helmet','watch','wheel','wetsuit','component'].includes(product.type),
   studio:product.deepStudio||null,
  },
  tabs:['overview','engineering','race-history','gallery'],
 });
}

export function artifactPrimaryAction(vm){
 if(vm?.actions?.inspect) return {id:'inspect',label:'Inspect in 3D'};
 return {id:'garage',label:'Add to Garage'};
}
