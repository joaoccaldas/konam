import assert from "node:assert/strict";
import fs from "node:fs";

const schema=JSON.parse(fs.readFileSync(new URL("./story.schema.json", import.meta.url),"utf8"));
assert.equal(schema.properties.schema_version.const,1);
const storyTypes=schema.properties.story_type.enum;
for (const t of ["product","athlete","science","race","history","place","campaign"]) {
  assert.ok(storyTypes.includes(t));
}
const beats=schema.properties.beats.items.properties.kind.enum;
for (const k of ["reveal","inspect","compare","explain","timeline","location","data","choice","cta"]) {
  assert.ok(beats.includes(k));
}
const sponsorship=schema.properties.sponsorship;
assert.ok(JSON.stringify(sponsorship).includes("disclosure"));
assert.ok(JSON.stringify(sponsorship).includes("editorial_independence"));

console.log("Story contract PASS");
