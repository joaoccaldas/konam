# Community, Content & Commerce Roadmap V1

Status: proposed implementation roadmap  
Date: 2026-10-02  
Scope: short-term through medium-term extensions to Kona.m growth, communications, content and merch systems.

## Purpose

Kona.m should be able to communicate with users, help users bring friends, publish useful race-week media, and test lightweight merchandise without turning the product into a spam engine or a fulfillment business.

The operating principle is:

> Earn attention with usefulness. Automate repetition, not judgment.

These capabilities extend the existing RaceIdentity share loop, The Feed, the intern voice, commerce adapters, and brand system. They do not create a second product shell.

## Time horizons

### Short term: launch + 0–6 weeks

Ship the minimum reliable infrastructure needed to own communication and measure genuine demand.

1. **Real Kona.m admin email**
   - Create one role-based mailbox on the production domain once DNS/domain ownership is finalized.
   - Preferred public role: `hello@` or `admin@` on the canonical domain.
   - Do not expose a founder/personal mailbox in public HTML, metadata, forms, logs or source.
   - Configure SPF, DKIM and DMARC before using the address for newsletter sends.
   - Route operational messages separately from newsletters.
   - Acceptance: send/receive works, authentication passes, reply-to is role-based, no personal address leaks on the public surface.

2. **Newsletter + signup**
   - Add an optional newsletter signup to the public surface and appropriate post-value moments.
   - Explicit consent only. No pre-checked opt-in and no account requirement.
   - Store: normalized email, consent timestamp, source surface, locale, unsubscribe state and minimal attribution.
   - Confirm ownership with double opt-in where supported.
   - Every message must contain one-click unsubscribe and the role-based sender identity.
   - Initial newsletter format:
     - what happened in Kona / triathlon this week;
     - 3–5 useful links;
     - one Intern summary;
     - one product/world discovery;
     - optional race-week utility;
     - no invented sponsorship or affiliate relationship.
   - Measure: signup conversion, confirmed opt-in rate, open/click where privacy-safe, unsubscribe, complaint rate, return-to-app rate.

3. **Invite your dudes & dudettes**
   - Keep the current privacy-safe branded invite as the base.
   - Surface it after a meaningful value moment, not before.
   - Native share sheet first; copy link and WhatsApp fallback.
   - Future referral reward only after the invited user completes a valid RaceIdentity.
   - Never reward pressing Share, raw link opens or bulk contact access.
   - Acceptance: canonical URL only, no local/profile state in link, cancellation is silent, no false claim that an invite was delivered.

4. **Social sharing**
   - Standardize share objects for:
     - RaceIdentity;
     - collection/find;
     - artifact/bike;
     - challenge completion;
     - race-week story.
   - Produce share media in 1:1, 4:5 and 9:16 from the same template contract.
   - Use Web Share API where available.
   - Treat Instagram/TikTok/Facebook as share destinations, not hard-coded private integrations unless an official supported API justifies it.
   - Deep link recipients to a useful public route with a clear `Build yours` or `Explore` continuation.
   - Measure share-to-open and open-to-RaceIdentity, not raw share button taps.

5. **The Feed: YouTube + news RSS + Intern summary**
   - Build on the existing RSS/Atom and YouTube feed adapters.
   - Maintain a curated source registry with provenance, enabled/disabled state, source type, locale and trust notes.
   - Normalize items into one canonical content object before rendering.
   - Deduplicate by canonical URL/content fingerprint.
   - Summaries must preserve source attribution and link to the original item.
   - The Intern may change tone and length, but may not change factual meaning.
   - The Intern voice is presentation, not source authority.
   - Add failure states: unavailable source, malformed feed, stale content, unsupported URL, summary unavailable.
   - Cache feeds and summaries so the client is not scraping external sources directly.
   - Separate:
     - factual extract;
     - Intern summary;
     - optional editorial note.
   - Never fabricate quotations, race results, sponsor claims or breaking-news facts.
   - Acceptance: safe URLs only, provenance shown, duplicate suppression, stale threshold, deterministic fallback summary, source opens correctly.

6. **Merch concept generator, internal only**
   - Create a repeatable pipeline that can turn approved Kona.m visual ingredients into merch concept boards.
   - Inputs:
     - approved brand tokens;
     - slogans/copy;
     - room/collection/artifact;
     - garment/product type;
     - locale;
     - target event/theme.
   - Outputs:
     - front/back product mockups;
     - print-ready asset candidate;
     - title/description;
     - variant matrix;
     - unit-cost placeholder;
     - target retail price scenario;
     - provenance/rights record;
     - status: concept / approved / listed / retired.
   - Generated visuals are concepts until a physical sample is checked.
   - No automatic publication or sale from generation alone.

## Medium term: 6 weeks–6 months

Convert the above into reusable systems that can support growth without adding manual chaos.

### 1. Communications layer

Create a small communications service with:
- subscriber registry;
- consent ledger;
- template registry;
- campaign records;
- suppression/unsubscribe list;
- sender-domain health checks;
- event hooks from RaceIdentity, challenge and content systems.

Channels:
- newsletter email first;
- transactional email only where product behavior genuinely needs it;
- optional push later after PWA/device permission strategy is proven.

No marketing communication without explicit consent.

### 2. Newsletter automation

Pipeline:

`SOURCES → NORMALIZE → SCORE → FACT EXTRACT → INTERN DRAFT → HUMAN/QUALITY GATE → TEMPLATE → SEND → METRICS`

Automation can:
- collect source candidates;
- deduplicate;
- draft summaries;
- assemble newsletter sections;
- generate subject-line variants;
- prepare preview builds.

Automation must not:
- send unreviewed factual claims during early operation;
- invent quotes or sources;
- silently convert editorial content into affiliate content;
- bypass unsubscribe/suppression state.

The human approval gate can later be reduced only after measurable accuracy and rollback controls exist.

### 3. Community/referral system

Add a server-authoritative referral record only when needed.

Suggested lifecycle:
- invite created;
- invite opened;
- RaceIdentity completed;
- optional account registered;
- referral activated;
- reward granted.

Abuse controls:
- self-referral prevention;
- rate limits;
- duplicate-device/account heuristics only where privacy-safe;
- no contact-book harvesting;
- no rewards tied to affiliate or purchase behavior.

### 4. Social publishing factory

Create one canonical social-media derivative service that can render:
- square;
- portrait feed;
- story/reel cover;
- landscape/open-graph.

The service consumes product state and approved templates. It should not require separate bespoke design code per channel.

Potential later outputs:
- scheduled content package;
- caption draft;
- alt text;
- source/provenance bundle;
- campaign tags;
- downloadable media kit.

Publishing credentials remain server-side and provider-specific. Start with export/share, not unattended auto-posting.

### 5. Intern Content Engine

Define the Intern as a bounded content transformation layer.

Contract:
- receives normalized source objects;
- receives factual extract separately;
- receives style mode;
- returns headline, summary, optional weird-but-clear signoff and confidence/flags;
- always preserves source IDs and canonical URLs.

Style modes can vary intentionally, for example:
- tiny;
- overexplained;
- all-caps panic;
- suspiciously poetic;
- first-day-at-work;
- one-line;
- race-week bulletin.

The voice may be unpredictable. The facts cannot be.

Quality gates:
- named-entity preservation;
- number/date consistency;
- link/source retention;
- unsupported-claim detector;
- banned private/confidential data;
- editorial/commercial disclosure check.

### 6. Merch Studio + print-on-demand adapter

Evolve the internal generator into a Merch Studio.

Canonical entities:
- `MerchDesign`
- `MerchProduct`
- `MerchVariant`
- `MerchProvider`
- `MerchOrder`
- `MerchFulfillmentEvent`

Provider-neutral order flow:

`APPROVED DESIGN → PROVIDER PRODUCT → USER ORDER → PAYMENT → PROVIDER ORDER → PRINT → SHIP → TRACK → DELIVER / EXCEPTION`

Rules:
- Kona.m should not hold inventory for the initial model.
- Use print-on-demand/order-and-ship where commercially viable.
- Provider adapter must hide provider-specific SKU, webhook and shipping differences from product UI.
- Only approved designs can become sellable.
- Physical sample approval required for flagship items before public promotion.
- Rights/provenance attached to every sellable design.
- Clear production/shipping estimates and return/refund policy.
- Tax/VAT, consumer-rights and customs handling must be validated for each selling geography before launch there.
- Commercial relationships and affiliate/referral status disclosed.

### 7. Merch concept automation

Automated concept loop:

`BRIEF → BRAND/RIGHTS CHECK → GENERATE VARIANTS → MOCKUPS → SCORE AGAINST BRAND CONTRACT → HUMAN SELECT → PRINT FILE → SAMPLE → APPROVE → LIST`

Candidate scoring dimensions:
- brand consistency;
- readability at physical size;
- production feasibility;
- likely print method;
- number of colors/ink coverage;
- rights risk;
- event relevance;
- novelty versus existing catalogue;
- margin scenario.

Do not use engagement prediction as the sole gate. Brand and production quality come first.

### 8. Commerce telemetry

Track the funnel without surveillance:
- merch impression;
- product opened;
- variant selected;
- checkout initiated;
- provider order accepted;
- shipped;
- delivered/refunded;
- support exception.

Keep user identity out of analytics where aggregate event data is sufficient.

## Architecture boundaries

Do not create:
- another account/profile system;
- another progression economy;
- a second content database for the Intern;
- channel-specific copies of canonical content;
- provider-specific merch logic in the UI;
- newsletter-only identity records outside the consent/subscriber registry.

Prefer adapters and canonical contracts:
- `ContentSourceAdapter`
- `SummaryAdapter`
- `EmailProviderAdapter`
- `SocialRenderAdapter`
- `MerchProviderAdapter`

## Suggested implementation sequence

### S0 — foundation
- role mailbox/domain authentication;
- consent schema;
- source registry;
- content object contract;
- merch concept schema.

### S1 — public growth
- newsletter signup;
- invite placement refinement;
- canonical share cards/deep links;
- social derivative renderer.

### S2 — content
- Feed source curation;
- YouTube/RSS normalization;
- Intern summary pipeline;
- provenance + stale/failure handling.

### S3 — merch experiments
- internal Merch Studio;
- automated visual concept batches;
- provider comparison;
- first physical samples;
- pricing/margin scenarios.

### S4 — commerce beta
- one provider adapter;
- one small approved product capsule;
- order/status webhooks;
- customer support/returns flow;
- end-to-end test order before public sale.

### S5 — scale
- referral activation/rewards;
- newsletter assembly automation;
- optional scheduled social export;
- multiple merch providers only if one-provider limitations justify complexity.

## Success metrics

### Communications
- newsletter confirmed opt-in rate;
- unsubscribe and complaint rate;
- newsletter → useful app return.

### Community
- share → open;
- open → RaceIdentity completion;
- activated referrals per 100 inviters;
- abuse/rejection rate.

### Content
- source freshness;
- duplicate rate;
- summary factual-error rate;
- feed item → useful downstream action;
- source click-through.

### Merch
- concepts generated → human-approved;
- approved → sample-approved;
- product-page conversion;
- contribution margin after product, payment, provider and support costs;
- fulfillment exception/refund rate;
- repeat purchase only after enough volume exists to interpret it.

## Explicit non-goals for the short term

- building our own email delivery infrastructure;
- importing user contact books;
- automatic mass-DM systems;
- auto-posting to every social network;
- buying inventory;
- running our own warehouse;
- marketplace/multi-seller mechanics;
- AI-generated merch sold without rights checks and physical sampling;
- newsletter volume for its own sake.

## Definition of done

This roadmap is successful when Kona.m can:
1. communicate from a real role-based address;
2. collect explicit newsletter consent;
3. let users share/invite without leaking state or incentivizing spam;
4. turn trusted YouTube/RSS sources into attributable Intern-written summaries;
5. automatically generate brand-consistent merch concepts;
6. test one real print-on-demand product from design through shipment;
7. measure each loop without creating a surveillance stack.
