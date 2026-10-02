import assert from "node:assert/strict";
import {getProductExperience,listProductPartRefs} from "./product-experience.mjs";

const canyon=getProductExperience("canyon-cfr-2027");
assert.ok(canyon);
assert.equal(canyon.source_kind,"public-catalog");
assert.equal(canyon.product.public,true);
assert.ok(canyon.maintenance.length>=1);
assert.ok(canyon.vendors.some(v=>v.provider==="Canyon"));
assert.equal(canyon.safety.remote_write,false);
assert.equal(canyon.safety.affiliate_tracking_enabled,false);

const cassette=getProductExperience("shimano-cs-r9200-11-30");
assert.ok(cassette);
assert.equal(cassette.source_kind,"candidate-component");
assert.equal(cassette.product.product_type,"cassette");
assert.ok(cassette.maintenance.length>=1);
assert.equal(cassette.offers.length,1);
assert.equal(cassette.offers[0].destination.affiliate,false);
assert.equal(cassette.offers[0].destination.tracking_method,"none");
assert.equal(cassette.stories.length,1);
assert.equal(cassette.stories[0].story_type,"product");
assert.ok(cassette.vendors.some(v=>v.provider==="Shimano"));
assert.ok(cassette.parts.length>=8);
assert.ok(cassette.parts.every(p=>p.id.startsWith("shimano-cs-r9200-11-30/part/")));
assert.equal(cassette.safety.candidate_promotion_allowed,false);

const edge=getProductExperience("garmin-edge1050");
assert.ok(edge);
assert.equal(edge.source_kind,"candidate-rider-interface");
assert.equal(edge.product.product_type,"bike_computer");

assert.equal(getProductExperience("does-not-exist"),null);
assert.equal(listProductPartRefs("does-not-exist").length,0);

console.log("Product Experience aggregation PASS");
