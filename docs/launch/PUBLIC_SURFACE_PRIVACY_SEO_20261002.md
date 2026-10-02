# Kona.m Public Surface Privacy + SEO Certification

Date: 2026-10-02  
Scope: public GitHub Pages/Vercel web bundle produced from `joaoccaldas/konam`  
Release branch: `fix/launch-readiness-critical`

## Release objective

Ship Kona.m as an independent, globally discoverable triathlon product while keeping private contributor identity and user data out of the public product surface.

The public product is allowed to contain:
- public event, athlete, photographer, brand and historical names when they are legitimate editorial subject matter or legally required attribution;
- public source URLs and source/license metadata;
- the Kona.m organization/product identity;
- public race and place facts that are already part of the app's sourced content.

The public product must not contain:
- private contributor names;
- personal email addresses;
- telephone/mobile contact details;
- home/local workstation paths;
- private keys, tokens, bearer credentials or cloud secrets;
- `Person` publisher/author/creator structured data for the product;
- hidden user/account state or private repository reference material.

The repository itself is a separate public surface. Git commit metadata is not copied into the app bundle. A sample of the current branch history showed personal-provider author email metadata on historical commits. Fully removing that from GitHub requires a deliberate history rewrite or repository-visibility change and is therefore not performed as part of this release.

## Automated privacy controls

### Source scan
`tools/scan_private_data.mjs` scans tracked text files for:
- private keys;
- GitHub, AWS, Google and OpenAI-style credential patterns;
- bearer tokens;
- consumer email addresses;
- local machine paths.

### Public-bundle scan
`tools/scan_public_surface.mjs` scans the staged deployment after the explicit allowlist is assembled.

It rejects:
- any email address;
- `tel:` links and telephone/mobile data fields;
- local `/Users/...` and `/home/...` paths;
- contributor-name variants for the account owner;
- `Person` publisher/author/creator metadata;
- secret/token patterns.

`tools/stage_site.sh` now runs this scan automatically after staged-site integrity validation, so the same privacy rule applies to release CI and Pages publication.

## Identity boundary

No human founder/author identity is used in public page metadata. Search metadata identifies the publisher as the organization/product `Kona.m`.

The canonical public URL currently contains the GitHub account slug because the site is hosted on GitHub Pages. That URL is infrastructure identity, not a rendered author/founder byline. A custom domain would be the cleanest future way to remove the account slug from the public origin.

## Search positioning

Primary discovery themes:
- Kona triathlon;
- IRONMAN World Championship;
- Kailua-Kona race week;
- triathlon;
- 3D triathlon bikes;
- triathlon gear and equipment;
- triathlon history and culture;
- immersive 3D museum/world.

The home page now contains these themes in visible people-first copy, page title/description, social metadata and Schema.org structured data. The copy also makes the global audience explicit, including Brazil, Sweden, Dubai, Europe and worldwide users.

## Structured data

Every hardened public page uses a Schema.org `@graph` containing:
1. `WebSite` for Kona.m;
2. `Organization` for the publisher;
3. the page entity, such as `SoftwareApplication`, `CollectionPage`, `AboutPage` or `WebPage`.

The home application additionally declares:
- `applicationCategory: SportsApplication`;
- `operatingSystem: Web, Android`;
- triathlon/Kona/IRONMAN topical entities;
- Kailua-Kona content location;
- crawlable social image and organization logo.

There is no `Person` publisher/author identity.

## Regional search strategy

### Global
Launch uses one canonical English product URL. This avoids regional duplication and keeps authority concentrated on the real product.

### Brazil
`pt-BR` is the first planned localization. It remains intentionally unpublished until the visible product copy and metadata are genuinely translated and human-QA'd. Only then should reciprocal `hreflang=pt-BR` be published.

### Sweden
The current global English canonical serves Sweden. A Swedish variant should only be added when there is a real Swedish-language page/product experience.

### Dubai / UAE
The current global English canonical serves Dubai/UAE users. A duplicate `en-AE` doorway page is deliberately not created. UAE-specific pages should exist only when they contain real local race/travel/community value.

### Europe
The global English canonical is the launch surface. Country/language variants should be introduced only alongside substantive localized content.

This follows current Google guidance: localized alternates should correspond to real language or regional page variants, and ranking work should remain people-first rather than keyword/doorway-page driven.

## Crawl/index controls

- canonical URLs point to `https://joaoccaldas.github.io/konam/`;
- `robots.txt` allows public crawling and advertises the sitemap;
- `sitemap.xml` lists hardened public pages with current `lastmod`;
- robots metadata allows large image previews and unrestricted useful snippets/video previews;
- Open Graph and Twitter cards use crawlable Kona.m images;
- `llms.txt` and `llms-full.txt` provide machine-readable product/evidence context;
- no fake regional `hreflang` is emitted before real localized pages exist.

## Trademark/affiliation boundary

Public metadata and product copy state that Kona.m is independent and not affiliated with or endorsed by IRONMAN, World Triathlon Corporation, Canyon, featured athletes or referenced brands.

IRONMAN® is identified as a registered trademark of World Triathlon Corporation. Third-party trademarks are used descriptively.

## Release evidence required before merge

The exact PR head must pass:
- App release seal;
- Release security gate;
- Integration contract;
- Museum checks;
- UI interaction evidence;
- Visual Evidence V2.

After merge/publication, the live origin must be checked again for:
- canonical URL and sitemap;
- title/description/OG metadata;
- structured-data graph;
- absence of public contributor/private-data leakage;
- mobile rendering and crawl accessibility.

## Known residuals

1. Public email account creation remains intentionally unavailable until production email delivery, account support and deletion/retention lifecycle are ready.
2. GitHub repository history is public and may contain historical commit-author email metadata. This is outside the staged web bundle.
3. Public photographer and athlete names remain where required for attribution or legitimate editorial content. Removing those would either damage factual content or violate attribution obligations.
4. A custom domain is recommended later to decouple the public product URL from the GitHub account slug.
