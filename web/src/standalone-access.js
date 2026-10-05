// Bookmarked engineering viewers share the main Studio entitlement resolver.
import './site-analytics.js';
import catalog from '../../museum/catalog/products.json' with { type: 'json' };
import { productAccess } from './engine/access.js';
export function standaloneDestination(page,options={}) {
  const product=catalog.products.find(p=>p.deepStudio===page);
  return product&&!productAccess(product,options).unlocked
    ? 'Studio.html?p='+encodeURIComponent(product.id) : null;
}
if(typeof location!=='undefined'){
  const destination=standaloneDestination(location.pathname.split('/').at(-1));
  if(destination)location.replace(new URL(destination,location.href));
}
