import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { dockEntries, DOCK_GROUPS } from '../src/world/room-dock.js';

const areas = [
  { id: 'kona', name: 'Kona Champions', floor: 'ground' },
  { id: 'sanctuary', name: 'Sanctuary', floor: 'ground' },
  { id: 'room-bio', name: 'Bio', floor: 'upper' },
  { id: 'wing-clock', name: 'Against the Clock', floor: 'ground' },
];
const landing = fs.readFileSync(new URL('../src/landing.js', import.meta.url), 'utf8');

test('every dock chip resolves to a mapped area and takes its name and floor from the map', () => {
  const e = dockEntries({ areas, rooms: [
    { area: 'kona', swatch: 'kona', sub: '5 titles' },
    { area: 'room-bio', swatch: 'bio', sub: 'Gallery' },
    { area: 'wing-clock', swatch: 'atlas', glyph: '⏱', sub: '9 works' },
    { area: 'bio', swatch: 'bio', sub: 'unmapped id is dropped, never a dead chip' },
  ] });
  assert.deepEqual(e.map(x => [x.room, x.group, x.name]), [
    ['kona', 'ground', 'Kona Champions'], ['room-bio', 'upper', 'Bio'], ['wing-clock', 'ground', 'Against the Clock']]);
});

test('bikes form their own tab and locked rooms say how to unlock them', () => {
  const e = dockEntries({ areas, rooms: [{ area: 'sanctuary', swatch: 'sanctuary', sub: '8 films' }],
    pieces: [{ name: 'Speedmax AL 9.0', years: '2009–2013', glb: 'x.glb' }],
    access: id => id === 'sanctuary' ? { unlocked: false, requiredLevel: 3 } : { unlocked: true } });
  assert.equal(e[0].locked, true);
  assert.equal(e[0].sub, 'Unlocks at level 3');
  assert.deepEqual([e[1].group, e[1].name, e[1].piece], ['bikes', 'AL 9.0', 0]);
  assert.deepEqual(DOCK_GROUPS.map(g => g[0]), ['ground', 'upper', 'bikes']);
});

test('landing builds the dock from map areas, with gallery ids matching the map', () => {
  assert.match(landing, /mountRoomDock\(\{ rail: \$\('rail'\), inner: \$\('railInner'\), entries: dockEntries\(\{\s*areas: liveAreas/);
  assert.match(landing, /galleries\.rooms\.map\(r => \(\{ area: 'room-' \+ r\.id/);
  assert.match(landing, /galleries\.rooms\.map\(r => R\('room-' \+ r\.id/, 'map registers gallery rooms as room-<id>');
  assert.doesNotMatch(landing, /\$\('railInner'\)\.insertAdjacentHTML/, 'one renderer, not ad-hoc inserts');
  assert.doesNotMatch(landing, /querySelectorAll\('\.chip'\)\.forEach/, 'active state goes through the dock');
});

test('card buttons keep each label in one flex item and photos never rely on inline handlers', () => {
  // .btn is a flex box with a gap: a bare word next to <span class="long"> renders as "Next   : 1999".
  assert.doesNotMatch(landing, /(?<!<span)>[A-Za-z][A-Za-z ]*<span class="long">/);
  // script-src 'self' blocks inline onerror, which left blocked photos as broken images with alt text.
  assert.doesNotMatch(landing, /onerror=/);
  assert.match(landing, /function dropBrokenPhotos\(root\)/);
});
