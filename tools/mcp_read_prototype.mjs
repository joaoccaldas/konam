#!/usr/bin/env node
import { invokeReadTool, listReadTools } from "../integrations/mcp-read-adapter.mjs";

const [tool, rawArgs = "{}"] = process.argv.slice(2);

if (!tool || tool === "--help") {
  console.log(JSON.stringify({
    usage: "node tools/mcp_read_prototype.mjs <tool> '<json args>'",
    tools: listReadTools()
  }, null, 2));
  process.exit(0);
}

let args;
try {
  args = JSON.parse(rawArgs);
} catch {
  console.error("invalid JSON arguments");
  process.exit(2);
}

try {
  const result = invokeReadTool(tool, args);
  console.log(JSON.stringify({ ok: true, tool, result }, null, 2));
} catch (err) {
  console.error(JSON.stringify({ ok: false, tool, error: String(err.message || err) }));
  process.exit(1);
}
