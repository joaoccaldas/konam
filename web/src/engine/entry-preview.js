export function chooseEntryPreview(bikes, previous, random = Math.random) {
  const candidates = bikes.filter(b => b.id !== previous);
  const pool = candidates.length ? candidates : bikes;
  if (!pool.length) return null;
  const index = Math.min(pool.length - 1, Math.max(0, Math.floor((Number(random()) || 0) * pool.length)));
  return pool[index];
}
