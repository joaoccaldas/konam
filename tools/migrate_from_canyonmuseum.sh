#!/usr/bin/env bash
set -euo pipefail

SOURCE_URL="${SOURCE_URL:-https://github.com/joaoccaldas/canyonmuseum.git}"
TARGET_URL="${TARGET_URL:-https://github.com/joaoccaldas/konam.git}"
WORKDIR="${WORKDIR:-/tmp/konam-migration}"

rm -rf "$WORKDIR"
mkdir -p "$WORKDIR"
cd "$WORKDIR"

echo "Cloning source as a mirror..."
git clone --mirror "$SOURCE_URL" canyonmuseum.git
cd canyonmuseum.git

echo "Source refs:"
git show-ref | wc -l

echo "Switching push target to Kona.m..."
git remote set-url --push origin "$TARGET_URL"

cat <<EOF
About to mirror all refs to:
  $TARGET_URL

This preserves branches, tags and binary history.
If the target already contains bootstrap commits, --force will replace matching refs.
EOF

git push --mirror --force

echo "Mirror push complete."
echo "Verify target refs and create migration/m0-equivalence-20261002 from:"
echo "  856b98f0d9392c48ef7a6ff0fedaa39d459ef14c"
