import fs from "node:fs";
import {getProduct} from "./public-catalog.mjs";
import {getCandidateProduct} from "./candidate-products.mjs";
import {getCandidateComponent} from "./candidate-components.mjs";
import {getRiderInterfaceCandidate} from "./candidate-rider-interface.mjs";
import {getRelations,getNeighbors} from "./triathlon-graph.mjs";

const maintenance=JSON.parse(fs.readFileSync(new URL("./maintenance-sources.json", import.meta.url),"utf8"));
const vendors=JSON.parse(fs.readFileSync(new URL("./vendor-programs.json", import.meta.url),"utf8"));
const offers=JSON.parse(fs.readFileSync(new URL("./commerce-offers.json", import.meta.url),"utf8"));
const shimanoStory=JSON.parse(fs.readFileSync(new URL("./stories/shimano-cs-r9200-engineering.json", import.meta.url),"utf8"));

const slug=s=>String(s??"")
  .toLowerCase()
  .normalize("NFKD")
  .replace(/[^a-z0-9]+/g,"-")
  .replace(/^-+|-+$/g,"");

function normalizeCandidate(x,sourceKind){
  if(!x) return null;
  return {
    schema_version:1,
    id:x.id,
    object_type:"product",
    product_type:x.type ?? x.category,
    brand:x.brand ?? null,
    label:x.model ?? x.id,
    public:false,
    readiness:x.readiness ?? "candidate",
    representation:x.representation ?? "provisional",
    capabilities:Array.isArray(x.capabilities)?x.capabilities:[],
    asset:x.asset_path ?? null,
    source_records:Array.isArray(x.source_records)?x.source_records:[],
    blockers:Array.isArray(x.blockers)?x.blockers:[],
    semantic_parts:Array.isArray(x.semantic_parts)?x.semantic_parts:[],
    fitment:x.fitment ?? x.fit ?? null,
    reuse_targets:Array.isArray(x.reuse_targets)?x.reuse_targets:[],
    source_kind:sourceKind
  };
}

function findBase(id){
  const pub=getProduct(id);
  if(pub) return {...pub,source_kind:"public-catalog",readiness:"public"};
  return normalizeCandidate(getCandidateProduct(id),"candidate-product")
    ?? normalizeCandidate(getCandidateComponent(id),"candidate-component")
    ?? normalizeCandidate(getRiderInterfaceCandidate(id),"candidate-rider-interface");
}

function vendorOptions(brand){
  if(typeof brand!=="string") return [];
  const b=brand.trim().toLowerCase();
  return vendors.providers.filter(v=>(v.provider??"").trim().toLowerCase()===b)
    .map(v=>({
      id:v.id,
      provider:v.provider,
      status:v.status,
      category:v.category,
      integration:v.integration,
      source:v.source,
      economics:v.economics,
      affiliate_approved:false,
      note:v.notes
    }));
}

function maintenanceFor(id){
  return maintenance.items.filter(x=>x.entity_id===id);
}
function offersFor(id){
  return offers.offers.filter(x=>Array.isArray(x.related_entity_ids)&&x.related_entity_ids.includes(id));
}
function storiesFor(id){
  const out=[];
  if(shimanoStory.entity_refs?.some(x=>x.id===id)) out.push(shimanoStory);
  return out;
}

function partRefs(base){
  const parts=Array.isArray(base?.semantic_parts)?base.semantic_parts:[];
  return parts.map((part,index)=>({
    id:`${base.id}/part/${slug(part)||`part-${index+1}`}`,
    product_id:base.id,
    label:part,
    index
  }));
}

export function getProductExperience(id){
  if(typeof id!=="string"||!id) return null;
  const product=findBase(id);
  if(!product) return null;

  const graphNode=product.public?{id:product.id,relations:getRelations(product.id),neighbors:getNeighbors(product.id)}:null;

  return {
    schema_version:1,
    id:product.id,
    source_kind:product.source_kind,
    product,
    parts:partRefs(product),
    maintenance:maintenanceFor(product.id),
    offers:offersFor(product.id),
    stories:storiesFor(product.id),
    vendors:vendorOptions(product.brand),
    graph:graphNode,
    safety:{
      remote_write:false,
      affiliate_tracking_enabled:false,
      candidate_promotion_allowed:product.public===true,
      current_blockers:product.blockers??[]
    }
  };
}

export function listProductPartRefs(id){
  const product=findBase(id);
  return product?partRefs(product):[];
}
