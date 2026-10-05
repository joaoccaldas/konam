// Canonical runtime stylesheet ordering authority.
// This is intentionally the CURRENT certified production order. Changing this order is a visual change
// and must be proven separately with exact-head visual evidence.
export const COMMON_DESIGN_LINKS=Object.freeze([
  'brand/tokens.css',
  'brand/themes.css',
  'brand/artifacts.css',
  'brand/typography.css',
  'web/styles/system.css',
  'web/styles/components.css',
]);

export const INDEX_DESIGN_LINKS=Object.freeze([
  ...COMMON_DESIGN_LINKS,
  'web/styles/shell-mobile.css',
  'web/styles/entry.css',
]);

export const pageDesignLinks=file=>file==='index.html'?INDEX_DESIGN_LINKS:COMMON_DESIGN_LINKS;

export function stylesheetLinks(html){
  return [...String(html).matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+\.css(?:\?[^"']*)?)["'][^>]*>/gi)]
    .map(match=>match[1].split('?')[0])
    .filter(href=>!/^https?:\/\//i.test(href));
}
