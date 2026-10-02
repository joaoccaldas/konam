// detect.js — one source of truth for "this is a phone" across every viewer.
// Why: phone browsers in "Desktop view / Desktop site" report pointer:fine and
// a ~980 px layout viewport, so (pointer: coarse) and innerWidth both lie and
// the desktop UI is drawn scaled into a corner. screen.width stays physical
// (~390–430 px) in that mode, so it is the reliable signal that the device is
// a phone regardless of what the page claims.

// True when the physical screen is phone-sized even if the layout says desktop.
const runtime = globalThis.__konaViewport;
export const desktopViewPhone = runtime?.desktopViewPhone ?? (Math.min(screen.width || 1e5, screen.height || 1e5) <= 500 && innerWidth > 820);

// Coarse pointer or a narrow viewport or a phone faking desktop width.
export const coarse = matchMedia('(pointer: coarse)').matches || innerWidth < 760 || desktopViewPhone;

// Narrow layout viewport (real small window), independent of pointer.
export const small = innerWidth < 760 || desktopViewPhone;

// Light performance mode: phone, small window, or battery-friendly request.
export const lite = coarse || small;

// Desktop-view phones are restyled by the inline fit() script in each viewer
// (html.phone-fit + --fit). Do not add a class for every coarse pointer —
// that overrode the real phone tab bar.
