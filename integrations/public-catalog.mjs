import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(fs.readFileSync(path.join(root, "integrations/public-catalog.json"), "utf8"));
const konaSources = JSON.parse(fs.readFileSync(path.join(root, "integrations/sources/kona-2026.ironman.json"), "utf8"));

function norm(v) {
  return typeof v === "string" ? v.trim().toLowerCase() : null;
}

export function listProducts({ type=null, brand=null } = {}) {
  const t=norm(type), b=norm(brand);
  return catalog.products.filter(p =>
    (!t || norm(p.product_type) === t) &&
    (!b || norm(p.brand) === b)
  );
}

export function getProduct(id) {
  if (typeof id !== "string") return null;
  return catalog.products.find(p => p.id === id) ?? null;
}

export function listEvents() {
  return [...catalog.events];
}

export function getEvent(id) {
  if (typeof id !== "string") return null;
  return catalog.events.find(e => e.id === id) ?? null;
}

export function listEventPlaces(eventId, { category=null } = {}) {
  if (eventId !== "kona-2026") return [];
  const c=norm(category);
  return catalog.places.filter(p => !c || p.categories.some(x => norm(x) === c));
}

export function getPlace(id) {
  if (typeof id !== "string") return null;
  return catalog.places.find(p => p.id === id) ?? null;
}

export function listEventSources(eventId, { currentOnly = false } = {}) {
  if (eventId !== konaSources.event_id) return [];
  return konaSources.sources.filter(s => !currentOnly || s.status === "current");
}

export function getEventSchedule(eventId) {
  if (eventId !== konaSources.event_id) return [];
  return Array.isArray(konaSources.current_facts?.race_week) ? [...konaSources.current_facts.race_week] : [];
}

export function getPublicCatalogMeta() {
  return {
    schema_version: catalog.schema_version,
    counts: catalog.counts,
    privacy: catalog.privacy
  };
}
