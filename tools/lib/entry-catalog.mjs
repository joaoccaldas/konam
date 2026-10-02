import { contentVisible } from '../../web/src/engine/event-visibility.js';
export const isSecretBike = p => p.secret === true || p.locked === true || (p.where || []).some(row => row.id === 'secret');
export function entryCatalog(products) {
  let mystery = 0;
  return products.filter(p => p.type === 'bike' && p.public !== false && contentVisible(p)).map(p => {
    if (isSecretBike(p)) return { id: `mystery-${++mystery}`, secret: true };
    return { id: p.id, label: p.name, brand: p.brand, year: p.year || null, image: `assets/entry/catalog/${p.id}.webp` };
  });
}
