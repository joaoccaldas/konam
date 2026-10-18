#!/usr/bin/env node
/** Evidence ledger for performance and production claims. No invented speedups. */
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
export function evaluateMeasurements(doc){
 const errors=[], rows=[];
 if(!Array.isArray(doc?.measurements))return {errors:['measurements array required'],rows};
 for(const m of doc.measurements){
  if(!m.id||!m.metric||!m.unit||!m.source||!m.sha||!/^[0-9a-f]{40}$/.test(m.sha)) {errors.push('incomplete provenance: '+(m.id||'?'));continue;}
  const numeric=Number.isFinite(m.baseline)&&Number.isFinite(m.candidate);
  const comparable=numeric&&m.baseline>0&&m.environment?.baseline&&m.environment?.candidate
   &&JSON.stringify(m.environment.baseline)===JSON.stringify(m.environment.candidate);
  const improvement=comparable&&m.direction==='lower'?100*(m.baseline-m.candidate)/m.baseline:
   comparable&&m.direction==='higher'?100*(m.candidate-m.baseline)/m.baseline:null;
  rows.push({id:m.id,metric:m.metric,unit:m.unit,source:m.source,sha:m.sha,
    baseline:m.baseline??null,candidate:m.candidate??null,
    improvement_percent:improvement===null?null:Number(improvement.toFixed(2)),
    claim_state:improvement===null?'observed-not-comparable':'paired-comparable',
    limitations:m.limitations||[]});
 }
 return {errors,rows};
}
export function main(args=process.argv.slice(2)){
 if(args.length!==1)throw Error('usage: node tools/evidence-metrics.mjs <private-or-public-evidence.json>');
 const result=evaluateMeasurements(JSON.parse(fs.readFileSync(args[0],'utf8')));
 if(result.errors.length){console.error(result.errors.join('\n'));process.exitCode=1;return;}
 process.stdout.write(JSON.stringify(result,null,2)+'\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main();
