import assert from "node:assert/strict";
import {listCandidateProducts,getCandidateProduct,canPromoteCandidate,candidateIntakeMeta} from "./candidate-products.mjs";

const meta=candidateIntakeMeta();
assert.equal(meta.count,11);
assert.equal(meta.source_branch,"assets/kona-environment-pack-20260930");

assert.equal(listCandidateProducts({type:"bike"}).length,6);
assert.equal(listCandidateProducts({type:"shoe"}).length,5);
assert.equal(listCandidateProducts({brand:"Nike"}).length,5);

const scott=getCandidateProduct("scott-plasma-rc-provisional");
assert.equal(scott.readiness,"blocked");
assert.equal(canPromoteCandidate(scott),false);

const alpha=getCandidateProduct("nike-alphafly-3-study");
assert.equal(alpha.setup_slot,"shoe");
assert.equal(canPromoteCandidate(alpha),false);

assert.equal(listCandidateProducts({readiness:"candidate"}).length,7);
assert.equal(listCandidateProducts({readiness:"blocked"}).length,4);

console.log("Candidate intake PASS: 11 assets, readiness gates enforced");
