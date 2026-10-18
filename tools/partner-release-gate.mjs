#!/usr/bin/env node
// Fail-closed release evidence gate. No tokens, credentials, or production mutations.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export const REQUIRED = [
  'sourcePinned','rollbackVerified','signupVerified','emailVerified',
  'pendingDenied','adminNotificationDelivered','adminApprovalVerified',
  'approvalAuditVerified','approvedAllowed','rejectedDenied','disabledDenied',
  'directApiDenied','directAssetDenied','sessionExpiryVerified',
  'desktopVisualApproved','mobileVisualApproved','portfolioJourneyApproved',
  'securityReviewApproved'
];
export function validatePartnerRelease(record) {
  const problems=[];
  if (!record || typeof record!=='object' || Array.isArray(record)) return ['Invalid evidence document'];
  if (typeof record.commit!=='string' || !/^[a-f0-9]{40}$/.test(record.commit)) problems.push('Missing pinned 40-character Git commit');
  if (typeof record.previewUrl!=='string' || !/^https:\/\/[a-z0-9.-]+\/?$/.test(record.previewUrl)) problems.push('Missing HTTPS preview URL');
  for(const key of REQUIRED) {
    const result=record.checks?.[key];
    if (!result || result.status!=='pass' || typeof result.evidence!=='string' || result.evidence.trim().length<8)
      problems.push(key+': requires pass plus evidence reference');
  }
  return problems;
}
export function main(argv=process.argv.slice(2)) {
  if(argv.length!==1){ console.error('usage: node tools/partner-release-gate.mjs <private-evidence.json>'); return 2; }
  let record;
  try { record=JSON.parse(fs.readFileSync(argv[0],'utf8')); }
  catch { console.error('Cannot read valid release evidence JSON'); return 2; }
  const problems=validatePartnerRelease(record);
  if(problems.length) {console.error('PARTNER RELEASE BLOCKED\n'+problems.map(p=>'- '+p).join('\n')); return 1;}
  console.log('Evidence completeness PASS. Human release approval and live probes still required.');
  return 0;
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href)process.exitCode=main();
