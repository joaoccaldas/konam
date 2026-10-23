// Complement to canonical museum/schemas/asset-manifest.schema.json.
// Rejects unsubstantiated commercial promotion; does not create asset identity.
export const DIMENSIONS=Object.freeze(['geometry','materials','topology','performance','interaction','portability','reproducibility','accessibility','visual']);
const HAS=Object.prototype.hasOwnProperty;
const nonempty=x=>typeof x==='string'&&x.trim().length>0;
export function assessAssetEvidence(manifest,review,{commercial=false}={}){
 const failures=[],unknown=[];
 if(!manifest||typeof manifest!=='object'||Array.isArray(manifest))return {approved:false,score:null,failures:['invalid asset manifest'],unknown:[]};
 if(!review||typeof review!=='object'||Array.isArray(review))return {approved:false,score:null,failures:['missing evidence review'],unknown:[]};
 if(!nonempty(manifest.id)||manifest.schema_version!==1)failures.push('invalid canonical asset identity/version');
 if(review.assetId!==manifest.id)failures.push('asset ID mismatch');
 if(!nonempty(review.sourceCommit)||! /^[a-f0-9]{40}$/.test(review.sourceCommit))failures.push('missing pinned source commit');
 if(!nonempty(review.reviewer)||!nonempty(review.reviewedAt)||!/^\d{4}-\d{2}-\d{2}$/.test(review.reviewedAt))failures.push('missing reviewer/date');
 if(!review.scores||typeof review.scores!=='object'||Array.isArray(review.scores))failures.push('missing scores');
 let total=0,complete=true;
 for(const dimension of DIMENSIONS){
  const item=review.scores?.[dimension];
  if(!item||typeof item!=='object'||Array.isArray(item)){
   unknown.push(dimension);complete=false;continue;
  }
  if(!Number.isInteger(item.rating)||item.rating<0||item.rating>5)failures.push('invalid rating: '+dimension);
  else total+=item.rating;
  if(!['measured','automated','human-review'].includes(item.evidenceType)||!nonempty(item.evidenceRef)){
   unknown.push(dimension);complete=false;
  }
 }
 if(review.scores&&Object.keys(review.scores).some(k=>!DIMENSIONS.includes(k)))failures.push('unknown score dimension');
 const commercialRights=['original','licensed'].includes(manifest.rights_state);
 if(commercial&&!commercialRights)failures.push('rights not cleared for commercial use');
 if(commercial&&manifest.validation_status!=='validated')failures.push('asset validation not complete');
 if(commercial&&review.independentApproval!==true)failures.push('independent approval required');
 if(commercial&&(!Array.isArray(review.visualEvidence)||review.visualEvidence.length===0||review.visualEvidence.some(x=>!nonempty(x))))failures.push('visual evidence references required');
 if(commercial&&!complete)failures.push('all scoring dimensions require evidence');
 return {approved:failures.length===0&&(!commercial||complete),score:complete&&failures.every(f=>!f.startsWith('invalid rating'))?Math.round(total/DIMENSIONS.length*20):null,failures,unknown};
}
