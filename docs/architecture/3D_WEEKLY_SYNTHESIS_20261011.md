# Unified 3D R&D | 11 Oct 2026

**Decision:** No cross-project shared renderer graduated. Research only; no production changes.

**Graduated locally:** Bellagio [#5](https://github.com/joaoccaldas/bellagio/pull/5) uses a single room index, same-origin pinned KONA packages, and fail-closed semantic identity. This is an iframe adapter, not a shared renderer. KONA [#135](https://github.com/joaoccaldas/konam/pull/135) repaired staged JSON 404s (498 local tests; 60 staged captures). Gaudí [#104](https://github.com/joaoccaldas/ai/pull/104) shifted Blender repeatability proof from byte hashes to semantic scene identity.

**Visual evidence:** Older NOR [#107](https://github.com/joaoccaldas/konam/pull/107) reduced desktop draw calls 666→113, phone 352→95, with instancing/merging and wall visibility fixes; not proof for final NOR Winter. Gaudí [#100](https://github.com/joaoccaldas/ai/pull/100) has 9/9 municipal sightlines, [#101](https://github.com/joaoccaldas/ai/pull/101) zero project blockers in 54 shadow rays; not final photoreal approval.

**Uncertain:** KONA final-room [#124](https://github.com/joaoccaldas/konam/pull/124) is nonmergeable draft. Studio-Kona [#54](https://github.com/joaoccaldas/studio-kona/pull/54) unload unmeasured; Canyon [#162](https://github.com/joaoccaldas/canyonmuseum/pull/162) mapping only. rawdog3d archived. BlocksCreateWorld uses Canvas2D.

**Next:** 1) exact-scene/staged preflight (score 12.50); 2) Bellagio/KONA visual and interaction parity (10.00); 3) resident versus unload A/B (4.17). Heuristic score = information gain × leverage / (effort × risk), 1–5 per factor.

**Stop/defer:** old room URLs, wholesale #123 merge, monorepo/runtime centralization, new rooms, KTX2/WebGPU/splats/HLOD without measured target-device proof.
