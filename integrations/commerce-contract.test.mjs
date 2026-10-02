import assert from "node:assert/strict";
import fs from "node:fs";

const offerSchema=JSON.parse(fs.readFileSync(new URL("./commerce-offer.schema.json", import.meta.url),"utf8"));
const conversionSchema=JSON.parse(fs.readFileSync(new URL("./conversion-event.schema.json", import.meta.url),"utf8"));

assert.equal(offerSchema.properties.schema_version.const,1);
assert.ok(offerSchema.properties.offer_type.enum.includes("product"));
assert.ok(offerSchema.properties.offer_type.enum.includes("accommodation"));
assert.ok(offerSchema.properties.offer_type.enum.includes("rental_car"));
assert.ok(offerSchema.properties.offer_type.enum.includes("attraction"));

const methods=offerSchema.properties.destination.properties.tracking_method.enum;
assert.deepEqual(new Set(methods),new Set(["none","provider-link","subid","server-attribution"]));

assert.equal(conversionSchema.properties.schema_version.const,1);
const events=conversionSchema.properties.event_type.enum;
for(const e of ["offer.impression","offer.opened","offer.outbound_click","conversion.reported"]) {
  assert.ok(events.includes(e));
}
const ids=conversionSchema.properties.privacy.properties.user_identifier.enum;
assert.ok(ids.includes("none"));

console.log("Commerce contracts PASS");
