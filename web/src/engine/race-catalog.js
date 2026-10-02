// Lazy, retryable race catalog. A network failure is not an empty search result.
let promise = null;
const norm = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function loadRaceCatalog() {
  if (!promise) promise = fetch('integrations/ironman-races-2016-2026.json', {cache:'force-cache', credentials:'same-origin'})
    .then(response => { if (!response.ok) throw new Error('Race catalog unavailable'); return response.json(); })
    .then(data => { if (!Array.isArray(data?.races)) throw new Error('Invalid race catalog'); return data; })
    .catch(error => { promise = null; throw error; });
  return promise;
}
export function raceSearchText(race) { return norm([race.name, race.brand, race.distance, race.year, race.slug].filter(Boolean).join(' ')); }
export async function searchRaces(query, {limit=8, yearMin=2016}={}) {
  const q = norm(query).trim(), tokens = q.split(/\s+/).filter(Boolean), data = await loadRaceCatalog();
  return data.races.filter(r => r.year >= yearMin && tokens.every(t => raceSearchText(r).includes(t)))
    .sort((a,b) => (norm(a.name).startsWith(q) ? 0 : 1) - (norm(b.name).startsWith(q) ? 0 : 1) || b.year-a.year || String(a.name).localeCompare(String(b.name)))
    .slice(0, Math.max(0, Math.min(100, Number(limit) || 0)));
}
export async function getRace(id) { return (await loadRaceCatalog()).races.find(r => r.id === id) || null; }
