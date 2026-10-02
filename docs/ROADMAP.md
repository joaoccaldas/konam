# KONA Roadmap V8 — 30 Sep 2026

## Product

**Race the version of yourself.**

KONA is a mobile-first triathlon race-week, identity, gear, story, discovery and challenge platform. The Canyon Museum is a flagship collection inside the platform, not the parent brand.

## Current production truth

Main includes:
- person-first RaceIdentity onboarding
- Home / Discover / Garage / Plan / Me navigation
- returning-user RaceIdentity continuity
- local-first progression and credits ledger
- lazy 3D entry
- BrandRoom/Nike proof
- privacy/security release gates
- canonical repository hardening
- RaceIdentity share loop V1
- Progression V2 configuration and 20 original relics
- Kona Local Graph V1
- sourced affiliate registry V1
- first tracked Supabase least-privilege migration

Still release-gated/open:
- real-phone mobile entry/readability + install fix
- semantic token migration
- bilingual EN/PT-BR SEO/i18n foundation
- Identity Assist source adapters
- real Garage
- Discover/Artifact redesign
- normalized backend

## North star

**WARI — Weekly Active Race Identities.**

Supporting funnel:
landing → Build → RaceIdentity reveal → share/save → Discover → challenge/collection → return.

## Ten execution gates

### G1 — Real-phone entry and install
Pass Android + iPhone physical-device evidence. PWA install must be obvious. Native APK is advertised only when a signed artifact is actually published.

### G2 — Brand system
Semantic tokens, typography, spacing, components and light/dark parity. Parent brand remains neutral until name clearance.

### G3 — English + Brazilian Portuguese
All primary shell/onboarding/Discover/Garage/Plan/Me copy from locale records. Indexable English and pt-BR entry surfaces with reciprocal hreflang, localized metadata, sitemap and LLM guides.

### G4 — Discover + Artifact
Places / Machines / People / Stories. Universal ArtifactDetail for bike, shoe, helmet, watch, component and memorabilia. 3D remains an explicit richer mode.

### G5 — Garage + Passport
Owned / Dream / Try equipment, saved setups and collections. Me owns Passport/progression/account. Empty states always offer a useful next action.

### G6 — Progression V2 runtime
Migrate hard-coded reward tables onto governed config. Reward meaningful firsts. Collections unlock cosmetics, historical rooms, challenge variants and dream-equipment slots. Never lock safety/compatibility.

### G7 — Growth loop
RaceIdentity deep link, native share sheet, social-ready visual card, referral attribution and server-verified REFERRAL_ACTIVATED. Never reward a share-button tap.

### G8 — Identity Assist + integrations
Official-source candidate adapters; explicit confirmation before race history persists. External activity/gear integrations remain adapters and require consent/revoke controls.

### G9 — Commerce
Apply to verified affiliate programs; activate links only after approval. Disclose affiliate status. Commission never affects ranking. Add B2B room/athlete/event activation packages.

### G10 — Production certification
Normalize valuable backend entities, migrations/backups/export/delete, observability, accessibility, 320/360/390/430 phone matrix, iPhone Safari/PWA, Android PWA/native, desktop Safari/Chrome, performance budgets and rollback proof.

## Growth principles

- Share identity/value, not spam.
- Optimize for share-to-build conversion, not raw share count.
- Rewards follow accomplishment, collection completion, mastery and verified referral outcomes.
- Social output should be attractive enough to post without editing.
- WhatsApp/Instagram/Facebook/TikTok distribution should use the OS-native share sheet where possible.
- No dark patterns, fake scarcity or forced contact access.

## SEO / LLM principles

- Useful crawlable text in the HTML.
- Stable entity IDs and source/provenance records.
- SoftwareApplication/Product/Place/Event structured data where truthful.
- EN/PT-BR localized metadata and reciprocal hreflang.
- concise llms.txt + detailed llms-full.txt + pt-BR guide.
- no keyword stuffing, doorway pages or invented claims.

## Monetization

Now:
- approved affiliate commerce
- immersive brand prototypes
- athlete/event activations
- sponsor rooms
- content/hosting retainers

Later:
- premium consumer features after retention proof
- white-label experience engine
- opt-in aggregate Owned/Dream/Try insight after privacy thresholds and scale

## Definition of public beta

A newcomer on a real phone can:
1. understand KONA immediately
2. create a RaceIdentity without an account
3. persist it
4. optionally install/save
5. Discover without loading 3D unless requested
6. earn legitimate progression
7. share a safe setup link
8. return to a personalized Home
9. encounter no P0/P1 blocker

## Definition of production

Public beta plus:
- normalized valuable persistence
- migration/backup/export/delete proof
- security/privacy review
- production observability
- accessibility evidence
- multi-device performance budgets
- signed native distribution if offered
- incident/rollback runbook
