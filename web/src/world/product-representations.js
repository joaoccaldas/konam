export const REPRESENTATIONS=Object.freeze(['proxy','museum','hero','engineering']);

export function representationManifest(product){
 if(!product?.id) throw new Error('Product id required');
 const r=product.representations||{};
 const legacy=product.glb||null;
 return Object.freeze({
  productId:product.id,
  proxy:r.proxy||null,
  museum:r.museum||legacy,
  hero:r.hero||legacy,
  engineering:r.engineering||r.hero||legacy,
 });
}

export function representationFor(product,state='museum'){
 const m=representationManifest(product);
 if(state==='engineering') return m.engineering||m.hero||m.museum||m.proxy;
 if(state==='hero') return m.hero||m.museum||m.proxy;
 if(state==='museum') return m.museum||m.proxy;
 if(state==='proxy') return m.proxy||m.museum;
 return null;
}

export function representationBudget(state,budget='medium'){
 const mb={low:{proxy:.15,museum:.6,hero:1.5,engineering:4},medium:{proxy:.25,museum:1,hero:2.5,engineering:7},high:{proxy:.4,museum:1.5,hero:4,engineering:12}};
 return mb[budget]?.[state]??mb.medium[state]??1;
}
