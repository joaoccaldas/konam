import { contentVisible } from '../web/src/engine/event-visibility.js';
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));

const productsSrc = read("museum/catalog/products.json");
const island = read("museum/kona/island-guide.json");

const allowedProductTypes = new Set(["bike","shoe","helmet","wheel","trisuit","artifact","artwork","crankset","cassette","aerobar_extensions","hydration","saddle","groupset","bike_computer","pedal","smart_trainer","smart_frame","trainer_accessory","accessory"]);
const safeId = id => typeof id === "string" && /^[a-z0-9][a-z0-9._-]*$/.test(id);

function representation(origin="") {
  const o=String(origin).toLowerCase();
  if (o.includes("geometry-study")) return "geometry-study";
  if (o.includes("photo-rebuild")) return "reference-calibrated";
  if (o.includes("canyon-model") || o.includes("canyon-archive")) return "published";
  if (o.includes("studio")) return "concept";
  return "provisional";
}

function productCapabilities(p) {
  const caps = ["inspect","collect","share"];
  if (Array.isArray(p.skins) && p.skins.length) caps.push("customize");
  if (["bike","shoe","helmet","wheel","trisuit"].includes(p.type)) caps.push("equip");
  if (p.museum) caps.push("visit");
  return [...new Set(caps)];
}

const products = productsSrc.products
  .filter(p => safeId(p.id) && allowedProductTypes.has(p.type) && p.public !== false && contentVisible(p))
  .map(p => ({
    schema_version: 1,
    id: p.id,
    object_type: "product",
    product_type: p.type,
    brand: p.brand ?? null,
    label: p.name ?? p.id,
    family: p.family ?? null,
    year: p.year ?? null,
    public: true,
    representation: representation(p.origin),
    capabilities: productCapabilities(p),
    asset: typeof p.glb === "string" ? p.glb : null,
    canonical_url: typeof p.deepStudio === "string" ? p.deepStudio : null,
    source_records: Array.isArray(p.sources)
      ? p.sources.flatMap(s => [s.file, s.url].filter(v => typeof v === "string"))
      : [],
    locations: Array.isArray(p.where) ? p.where.map(w => w.id).filter(Boolean) : []
  }));

const places = (island.places ?? [])
  .filter(p => safeId(p.id))
  .map(p => ({
    schema_version: 1,
    id: p.id,
    object_type: "place",
    public: true,
    label: p.name,
    region: p.region ?? null,
    categories: Array.isArray(p.categories) ? p.categories : [],
    capabilities: ["inspect","visit","share"],
    representation: "published",
    source_records: typeof p.source === "string" ? [p.source] : [],
    sensitivity: p.sensitivity ?? "normal"
  }));

const event = island.race_2026 ? [{
  schema_version: 1,
  id: "kona-2026",
  object_type: "event",
  public: true,
  label: island.race_2026.event,
  date: island.race_2026.date,
  location: island.race_2026.location,
  capabilities: ["inspect","visit","share"],
  representation: "published",
  source_records: [island.race_2026.source].filter(Boolean)
}] : [];

const graph = {
  schema_version: 1,
  generated_by: "tools/build_public_catalog.mjs",
  generated_from: [
    "museum/catalog/products.json",
    "museum/kona/island-guide.json"
  ],
  privacy: {
    contains_user_state: false,
    contains_accounts: false,
    contains_tracking_ids: false,
    remote_writes: false
  },
  counts: {
    products: products.length,
    places: places.length,
    events: event.length
  },
  products,
  places,
  events: event
};

const outPath = path.join(root, "integrations/public-catalog.json");
const text = JSON.stringify(graph, null, 2) + "\n";

if (process.argv.includes("--check")) {
  if (!fs.existsSync(outPath)) {
    console.error("public catalog missing");
    process.exit(1);
  }
  const existing = fs.readFileSync(outPath, "utf8");
  if (existing !== text) {
    console.error("public catalog is stale; run node tools/build_public_catalog.mjs");
    process.exit(1);
  }
  console.log(`Public catalog PASS: ${products.length} products, ${places.length} places, ${event.length} events`);
} else {
  fs.writeFileSync(outPath, text);
  console.log(`Wrote integrations/public-catalog.json: ${products.length} products, ${places.length} places, ${event.length} events`);
}
