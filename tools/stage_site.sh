#!/usr/bin/env bash
# One public asset allowlist, used locally and by CI before upload. Run from the repository root.
set -euo pipefail
GITHUB_SHA=${GITHUB_SHA:-$(git rev-parse HEAD)}
GITHUB_REF_NAME=${GITHUB_REF_NAME:-$(git branch --show-current)}
GITHUB_RUN_ID=${GITHUB_RUN_ID:-local}
export GITHUB_SHA GITHUB_REF_NAME GITHUB_RUN_ID
mkdir -p _site
node web/build_nor3_review.mjs
printf '{"sha":"%s","ref":"%s","run_id":"%s","built_at":"%s"}\n' "$GITHUB_SHA" "$GITHUB_REF_NAME" "$GITHUB_RUN_ID" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > _site/release.json
cp ./*.html manifest.webmanifest sw.js robots.txt sitemap.xml llms.txt llms-full.txt _site/
mkdir -p _site/app
cp app/companion-ui.js app/account-auth.js app/viewport.js app/kona-core.js app/world-shell.html app/race-self-stage.js app/collectible-stage.js app/entry-data.json app/admin-assets.json app/admin-assets-ui.js app/admin-asset-preview.js app/nor3-review.js app/app-manifest.json app/android-version.json app/museum-data.js app/hall.js app/studio.js app/standalone-access.js app/studio-catalog.js _site/app/
mkdir -p _site/integrations/companion
cp integrations/companion/feed.json integrations/companion/rss.xml integrations/companion/travel.json _site/integrations/companion/
mkdir -p _site/integrations
cp integrations/public-catalog.json integrations/ironman-races-2016-2026.json _site/integrations/
mkdir -p _site/web/styles _site/web/src/engine _site/brand
cp web/styles/hall-web.css web/styles/hall-mobile.css web/styles/studio.css web/styles/experience.css web/styles/passport.css web/styles/collection.css web/styles/entry.css web/styles/system.css web/styles/components.css web/styles/admin-assets.css web/styles/shell-mobile.css web/styles/race-self.css web/styles/companion.css web/styles/home.css web/styles/garage.css web/styles/plan.css web/styles/promo.css web/styles/about.css web/styles/room-review.css _site/web/styles/
cp web/src/engine/storage.js _site/web/src/engine/
cp web/src/promo.js web/src/about-story.js web/src/site-analytics.js web/src/room-review-norwegian.js web/src/roomkit.js _site/web/src/
cp brand/tokens.css brand/themes.css brand/artifacts.css brand/typography.css _site/brand/
if [ -d downloads ]; then rsync -a downloads/ _site/downloads/; fi
if [ -d review ]; then mkdir -p _site/review && rsync -a review/ _site/review/; fi
rsync -a assets/ _site/assets/ --exclude reference/
mkdir -p _site/assets/reference && rsync -a assets/reference/paintings/ _site/assets/reference/paintings/
mkdir -p _site/docs && cp docs/FIT_RESEARCH_AND_ROADMAP.md _site/docs/
mkdir -p _site/docs/audit-20260929
cp docs/audit-20260929/room-horror.png docs/audit-20260929/room-alien.png docs/audit-20260929/room-zombie.png _site/docs/audit-20260929/
test -f _site/release.json
node -e "const r=require('./_site/release.json'); if(r.sha!==process.env.GITHUB_SHA) process.exit(1)"
test -f _site/index.html && test -f _site/manifest.webmanifest && test -f _site/sw.js
test -f _site/app/account-auth.js && test -f _site/app/viewport.js && test -f _site/app/kona-core.js && test -f _site/app/world-shell.html && test -f _site/app/race-self-stage.js && test -f _site/app/collectible-stage.js && test -f _site/app/entry-data.json && test -f _site/app/admin-assets.json && test -f _site/app/admin-asset-preview.js && test -f _site/app/nor3-review.js
test -f _site/integrations/companion/feed.json && test -f _site/integrations/companion/travel.json && test -f _site/web/styles/companion.css && test -f _site/web/styles/plan.css
test -f _site/integrations/public-catalog.json && test -f _site/integrations/ironman-races-2016-2026.json
test -f _site/web/src/promo.js && test -f _site/web/src/about-story.js && test -f _site/web/src/site-analytics.js && test -f _site/web/src/room-review-norwegian.js && test -f _site/web/src/roomkit.js && test -f _site/web/styles/promo.css && test -f _site/web/styles/about.css && test -f _site/web/styles/room-review.css && test -f _site/norwegian-engine-review.html
test -f _site/web/styles/shell-mobile.css && test -f _site/web/styles/components.css && test -f _site/web/styles/admin-assets.css && test -f _site/web/styles/studio.css && test -f _site/web/styles/experience.css && test -f _site/web/styles/passport.css && test -f _site/web/styles/collection.css && test -f _site/brand/tokens.css && test -f _site/brand/typography.css
test -f _site/app/museum-data.js && test -f _site/app/hall.js && test -f _site/app/studio.js && test -f _site/app/studio-catalog.js
test -f _site/docs/audit-20260929/room-horror.png && test -f _site/docs/audit-20260929/room-alien.png && test -f _site/docs/audit-20260929/room-zombie.png
node tools/validate-staged-site.mjs _site
node tools/scan_public_surface.mjs _site
