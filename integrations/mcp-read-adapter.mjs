import {
  listProducts,
  getProduct,
  listEvents,
  getEvent,
  listEventPlaces,
  getPlace,
  listEventSources,
  getEventSchedule
} from "./public-catalog.mjs";
import {getProductExperience} from "./product-experience.mjs";

const TOOL_NAMES = new Set([
  "list_products",
  "get_product",
  "list_events",
  "get_event",
  "list_event_places",
  "get_place",
  "list_event_sources",
  "get_event_schedule",
  "get_product_experience"
]);

function plainObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function rejectUnknownArgs(args, allowed) {
  for (const key of Object.keys(args)) {
    if (!allowed.has(key)) {
      throw new Error(`unknown argument: ${key}`);
    }
  }
}

export function invokeReadTool(name, args = {}) {
  if (!TOOL_NAMES.has(name)) throw new Error("unknown tool");
  if (!plainObject(args)) throw new Error("args must be an object");

  switch (name) {
    case "list_products": {
      rejectUnknownArgs(args, new Set(["type","brand"]));
      return listProducts({ type: args.type ?? null, brand: args.brand ?? null });
    }
    case "get_product": {
      rejectUnknownArgs(args, new Set(["id"]));
      if (typeof args.id !== "string" || !args.id) throw new Error("id required");
      return getProduct(args.id);
    }
    case "list_events": {
      rejectUnknownArgs(args, new Set());
      return listEvents();
    }
    case "get_event": {
      rejectUnknownArgs(args, new Set(["id"]));
      if (typeof args.id !== "string" || !args.id) throw new Error("id required");
      return getEvent(args.id);
    }
    case "list_event_places": {
      rejectUnknownArgs(args, new Set(["event_id","category"]));
      if (typeof args.event_id !== "string" || !args.event_id) throw new Error("event_id required");
      return listEventPlaces(args.event_id, { category: args.category ?? null });
    }
    case "list_event_sources": {
      rejectUnknownArgs(args, new Set(["event_id","current_only"]));
      if (typeof args.event_id !== "string" || !args.event_id) throw new Error("event_id required");
      return listEventSources(args.event_id,{currentOnly:args.current_only === true});
    }
    case "get_event_schedule": {
      rejectUnknownArgs(args, new Set(["event_id"]));
      if (typeof args.event_id !== "string" || !args.event_id) throw new Error("event_id required");
      return getEventSchedule(args.event_id);
    }
    case "get_product_experience": {
      rejectUnknownArgs(args, new Set(["id"]));
      if (typeof args.id !== "string" || !args.id) throw new Error("id required");
      const publicProduct=getProduct(args.id);
      if (!publicProduct) return null;
      return getProductExperience(args.id);
    }
    case "get_place": {
      rejectUnknownArgs(args, new Set(["id"]));
      if (typeof args.id !== "string" || !args.id) throw new Error("id required");
      return getPlace(args.id);
    }
  }
}

export function listReadTools() {
  return [...TOOL_NAMES];
}
