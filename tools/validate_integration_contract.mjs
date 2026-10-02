import fs from "node:fs";

const caps = JSON.parse(fs.readFileSync(new URL("../integrations/capabilities.json", import.meta.url), "utf8"));
const schema = JSON.parse(fs.readFileSync(new URL("../integrations/integration-object.schema.json", import.meta.url), "utf8"));
const graphSchema = JSON.parse(fs.readFileSync(new URL("../integrations/triathlon-graph.schema.json", import.meta.url), "utf8"));
const eventSchema = JSON.parse(fs.readFileSync(new URL("../integrations/domain-event.schema.json", import.meta.url), "utf8"));

const errors = [];
if (caps.schema_version !== 1) errors.push("capabilities schema_version must be 1");
if (schema.properties?.schema_version?.const !== 1) errors.push("object schema_version must be 1");
if (graphSchema.properties?.schema_version?.const !== 1) errors.push("graph schema_version must be 1");
if (eventSchema.properties?.schema_version?.const !== 1) errors.push("event schema_version must be 1");
if (!graphSchema.properties?.edges?.items?.properties?.relationship?.enum?.includes("manufactured_by")) errors.push("graph relationship vocabulary incomplete");
if (!eventSchema.properties?.event_type?.enum?.includes("setup.shared")) errors.push("domain event vocabulary incomplete");

for (const required of ["inspect","customize","collect","equip","share"]) {
  if (!caps.capabilities.includes(required)) errors.push(`missing core capability: ${required}`);
}
for (const tool of caps.mcp.read_tools) {
  if (!caps.read_surfaces.includes(tool)) errors.push(`MCP read tool is not declared as read surface: ${tool}`);
}
if (caps.remote_write_default !== "disabled") errors.push("remote writes must default to disabled");
if (caps.privacy.account_required !== false) errors.push("account must remain optional in V0");
if (caps.privacy.analytics_default !== "off") errors.push("analytics must remain off by default");
if (caps.privacy.background_location !== false) errors.push("background location must remain disabled");

if (errors.length) {
  for (const e of errors) console.error("ERROR", e);
  process.exit(1);
}
console.log("Integration contract PASS");
