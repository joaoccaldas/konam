#!/usr/bin/env bash
# One public asset allowlist, used locally and by CI before upload. Run from the repository root.
set -euo pipefail
GITHUB_SHA=${GITHUB_SHA:-$(git rev-parse HEAD)}
GITHUB_REF_NAME=${GITHUB_REF_NAME:-$(git branch --show-current)}
GITHUB_RUN_ID=${GITHUB_RUN_ID:-local}
export GITHUB_SHA GITHUB_REF_NAME GITHUB_RUN_ID
mkdir -p _site
printf '{"sha":"%s","ref":"%s","run_id":"%s","built_at":"%s"}\n' "$GITHUB_SHA" "$GITHUB_REF_NAME" "$GITHUB_RUN_ID" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > _site/release.json
cp ./*.html manifest.webmanifest sw.js robots.txt sitemap.xml llms.txt llms-full.txt _site/
mkdir -p _site/app
cp app/viewport.js app/kona-core.js app/world-shell.html app/race-self-stage.js app/collectible-stage.js app/entry-data.json app/admin-assets.json app/admin-asset-preview.js app/app-manifest.json app/android-version.json app/museum-data.js app/hall.js app/studio.js app/studio-catalog.js _site/app/
mkdir -p _site/integrations/companion
cp integrations/companion/feed.json integrations/companion/rss.xml integrations/companion/travel.json _site/integrations/companion/
mkdir -p _site/integrations
cp integrations/public-catalog.json integrations/ironman-races-2016-2026.json _site/integrations/
mkdir -p _site/web/styles _site/brand
cp web/styles/hall-web.css web/styles/hall-mobile.css web/styles/studio.css web/styles/experience.css web/styles/collection.css web/styles/entry.css web/styles/system.css web/styles/components.css web/styles/admin-assets.css web/styles/shell-mobile.css web/styles/race-self.css web/styles/companion.css web/styles/home.css web/styles/garage.css _site/web/styles/
cp brand/tokens.css brand/themes.css brand/artifacts.css brand/typography.css _site/brand/
if [ -d downloads ]; then rsync -a downloads/ _site/downloads/; fi
rsync -a assets/ _site/assets/ --exclude reference/
mkdir -p _site/assets/reference && rsync -a assets/reference/paintings/ _site/assets/reference/paintings/
mkdir -p _site/docs && cp docs/FIT_RESEARCH_AND_ROADMAP.md _site/docs/
test -f _site/release.json
node -e "const r=require('./_site/release.json'); if(r.sha!==process.env.GITHUB_SHA) process.exit(1)"
test -f _site/index.html && test -f _site/manifest.webmanifest && test -f _site/sw.js
test -f _site/app/viewport.js && test -f _site/app/kona-core.js && test -f _site/app/world-shell.html && test -f _site/app/race-self-stage.js && test -f _site/app/collectible-stage.js && test -f _site/app/entry-data.json && test -f _site/app/admin-assets.json && test -f _site/app/admin-asset-preview.js
test -f _site/integrations/companion/feed.json && test -f _site/integrations/companion/travel.json && test -f _site/web/styles/companion.css
test -f _site/integrations/public-catalog.json && test -f _site/integrations/ironman-races-2016-2026.json
test -f _site/web/styles/shell-mobile.css && test -f _site/web/styles/components.css && test -f _site/web/styles/admin-assets.css && test -f _site/web/styles/studio.css && test -f _site/web/styles/experience.css && test -f _site/web/styles/collection.css && test -f _site/brand/tokens.css && test -f _site/brand/typography.css
test -f _site/app/museum-data.js && test -f _site/app/hall.js && test -f _site/app/studio.js && test -f _site/app/studio-catalog.js
node tools/validate-staged-site.mjs _site
