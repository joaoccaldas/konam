# Kona Beta MVP — 30 Sep to 10 Oct 2026

## Product promise

**One place for Kona race week, plus a collectible 3D world that rewards exploration.**

Day-one shell:
- **Now** — race countdown, verified schedule, useful next actions.
- **Explore** — the museum/world, hidden rooms, bikes, shoes, engineering and stories.
- **Setup** — customize and save a race setup.
- **Plan** — race-week schedule and useful Kona places.
- **Me** — Passport, XP, streaks, badges, collection progress, privacy and optional cloud backup.

Core loop:

`USE → EXPLORE → COLLECT → UNLOCK → CUSTOMIZE → SHARE → RETURN`

The museum is intentionally deeper than the first-session UI. Existing rooms/assets are retained and can be surfaced gradually through progression and releases.

## Canonical state

Runtime domains keep their proven validators, but cloud/privacy serialization is one versioned GameState:
- profile/settings/favourites/liveries
- Passport progression (XP, streaks, stamps, badges)
- hidden finds
- RaceSetup
- Garage saved builds

Anonymous/local play remains the default. Account sync is optional.

## Backend

Prototype backend: Supabase project `canyonmuseum-beta`, EU North.

Table: `public.user_app_state`
- one row per `auth.users.id`
- JSONB versioned GameState
- RLS enabled
- authenticated users can only CRUD their own row
- anon has no table privileges
- zero security/performance advisor findings at creation

Auth V0: email magic link. Google/Apple OAuth stays feature-flagged until provider credentials/redirect URIs are configured.

## Beta test script

Create at least 5 test identities/devices:
1. **New visitor / Android phone** — no prior state.
2. **Returning local visitor** — existing Passport stamps and profile.
3. **Signed-in user A** — creates progress and cloud backup.
4. **Signed-in user B** — verifies zero access to user A state.
5. **Cross-device user A** — restores user A state on second browser/device.

For each tester:
1. Open home at 320–430 px width.
2. Explain what the app is within 5 seconds without help.
3. Open **Now** and identify the next Kona activity.
4. Enter **Explore**, collect at least one new stamp/find.
5. Inspect one 3D bike and open Studio.
6. Customize a bike.
7. Save/share the exact configuration; on Android choose WhatsApp from the native share sheet when available.
8. Return to the app and verify progression changed.
9. Sign in by magic link.
10. Back up device state.
11. Open a clean second browser profile, sign in as the same user, restore, reload, verify XP/stamps/setup/garage.
12. Sign in as another user and verify user A state is inaccessible.
13. Test offline reload after the first successful load.
14. Delete/export local app data and verify behavior matches the privacy copy.

Pass criteria:
- no uncaught console errors in core flow
- no user can read another user's state
- first collectible in < 60 seconds
- first useful Kona information in < 15 seconds
- shared setup opens the same configuration
- restore reproduces progression and setup
- 360 px screen has no blocked primary action

## Release train

### Sep 30 — Beta 0: useful + playable
- unified shell: Now / Explore / Setup / Plan / Me
- Passport/XP/streak/badges visible as the game layer
- source-grounded Kona schedule + places
- local GameState facade
- free authenticated cloud backup/restore
- exact setup deep-link sharing
- public museum remains deeper exploration, not deleted

### Oct 1 — Collection clarity
- 3D collection cabinet/cards
- rarity labels
- nine real hidden finds fully wired to Passport
- collection completion feedback

### Oct 2 — Garage + share
- Garage of saved bike builds
- premium mobile share card
- WhatsApp-native share flow through Web Share API
- recipient deep-links into the exact object/setup

### Oct 3 — Daily return loop
- deterministic daily exhibit
- daily Kona fact/source
- one daily challenge
- reward is content/capability, not fake currency

### Oct 4 — Equipment expansion
- first non-Canyon bike in public collection
- Nike Alphafly candidate promoted only if asset/source gates pass
- setup compatibility surfaced in UI

### Oct 5 — Engineering rooms
- exploded parts/maintenance stories
- engineering-study quality badges
- Hero/Museum/Study asset quality tier visibly enforced

### Oct 6 — Expo week mode
- Expo schedule becomes top-level Now content
- race-week quick actions
- source timestamps/freshness visible

### Oct 7 — Places + planning
- saved Kona places
- half-day / recovery collections
- respectful cultural-context cards

### Oct 8 — Social proof
- shareable collection milestones
- setup comparison deep links
- no generic social feed

### Oct 9 — Pre-race mode
- tomorrow/race-morning checklist
- key official information shortcuts
- aggressive cache + mobile regression check

### Oct 10 — Race day
- race-day home state
- official links/timing handoff where verified
- spectator/place shortcuts
- post-race collection/memory unlock path

## Monetization path

Do **not** gate the core beta behind payment.

1. **Affiliate commerce** on high-intent product/place objects after program approval.
2. **Sponsored/partner rooms** for bike, shoe, helmet, trainer and component brands.
3. **B2B white-label event worlds** for race organizers/destinations.
4. **3D product experience services**: measured asset + room + story + configurator.
5. **Premium consumer layer later** only when cross-device/history/planning utility proves willingness to pay.

The sales prototype is the same product: a partner should be able to see how its brand can become a collectible room, engineering story and setup-compatible object without a bespoke code fork.
