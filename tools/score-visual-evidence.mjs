import fs from 'node:fs';import path from 'node:path';
const dir=process.argv[2]||'visual-evidence-v2';const report=JSON.parse(fs.readFileSync(path.join(dir,'report.json'),'utf8'));
const rows=report.map(r=>{
 const m=r.metrics;
 const technical={
  noOverflow:m.overflowX?0:1,
  noErrors:r.errors.length?0:1,
  noHeavyEntry:r.state==='landing'?(r.heavyRequests.length?0:1):1,
  touchTargets:m.smallTargets.length?0:1,
  primaryDiscipline:m.primaryActions<=1?1:0,
 };
 const technicalScore=Math.round(Object.values(technical).reduce((a,b)=>a+b,0)/5*100);
 return{viewport:r.viewport,theme:r.theme,state:r.state,technicalScore,...technical,
  review:{hierarchy:null,typography:null,imageTreatment:null,gridAlignment:null,whitespace:null,ctaClarity:null,brandConsistency:null,ergonomics:null,progressiveDisclosure:null,referenceFidelity:null},
  note:'Human/vision review fields intentionally null until the screenshot itself is inspected.'};
});
fs.writeFileSync(path.join(dir,'scorecard.json'),JSON.stringify({scale:'0-100; null means not visually reviewed',releaseThreshold:{technical:100,visualOverall:88,ctaClarity:95,mobileErgonomics:95},rows},null,2)+'\n');
console.log(`scorecard: ${rows.length} runtime states; technical facts scored, visual judgments left unclaimed until reviewed`);
