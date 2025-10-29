#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ARCHIVE_BASENAME="${1:-coordination-v2-$(date +%Y%m%d%H%M%S)}"
ARCHIVE_DIR="${ROOT_DIR}/dist"
STAGING_DIR="${ROOT_DIR}/.release-staging"
WORK_DIR="${STAGING_DIR}/workdir"
ARTIFACT_ROOT="${STAGING_DIR}/${ARCHIVE_BASENAME}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: '$1' is required but not installed." >&2
    exit 1
  fi
}

require_cmd npm
require_cmd zip
require_cmd rsync

cleanup() {
  rm -rf "$STAGING_DIR"
}
trap cleanup EXIT

echo ">> Preparing staging area"
rm -rf "$STAGING_DIR"
mkdir -p "$WORK_DIR"

echo ">> Copying repository snapshot"
rsync -a --delete \
  --exclude ".git" \
  --exclude "node_modules" \
  --exclude ".next" \
  --exclude "logs" \
  --exclude "dist" \
  --exclude ".release-staging" \
  "$ROOT_DIR/" "$WORK_DIR/"

echo ">> Installing frontend dependencies"
pushd "$WORK_DIR" >/dev/null
npm ci

echo ">> Running lint checks"
npm run lint

echo ">> Building Next.js application"
NEXT_TELEMETRY_DISABLED=1 npm run build -- --webpack

echo ">> Pruning frontend dev dependencies"
npm prune --omit=dev

echo ">> Assembling frontend artifact"
mkdir -p "$ARTIFACT_ROOT/frontend/.next" "$ARTIFACT_ROOT/frontend/public"
rsync -a --exclude "cache" ".next/" "$ARTIFACT_ROOT/frontend/.next/"
rsync -a "public/" "$ARTIFACT_ROOT/frontend/public/"
rsync -a "node_modules/" "$ARTIFACT_ROOT/frontend/node_modules/"

for file in package.json package-lock.json next.config.ts postcss.config.mjs tailwind.config.js tsconfig.json next-env.d.ts health-check.js; do
  if [[ -e "$file" ]]; then
    rsync -a "$file" "$ARTIFACT_ROOT/frontend/"
  fi
done
popd >/dev/null

echo ">> Installing server dependencies"
pushd "$WORK_DIR/server" >/dev/null
npm ci --omit=dev

echo ">> Assembling server artifact"
mkdir -p "$ARTIFACT_ROOT/server"
rsync -a --exclude ".git" --exclude "logs" ./ "$ARTIFACT_ROOT/server/"
popd >/dev/null

echo ">> Collecting shared operational files"
for shared in ecosystem.config.js deploy.sh README.md; do
  if [[ -e "$WORK_DIR/$shared" ]]; then
    rsync -a "$WORK_DIR/$shared" "$ARTIFACT_ROOT/"
  fi
done

mkdir -p "$ARCHIVE_DIR"
ARCHIVE_PATH="${ARCHIVE_DIR}/${ARCHIVE_BASENAME}.zip"

echo ">> Creating archive at ${ARCHIVE_PATH}"
pushd "$STAGING_DIR" >/dev/null
zip -rq "$ARCHIVE_PATH" "$(basename "$ARTIFACT_ROOT")"
popd >/dev/null

echo ">> Release package ready: $ARCHIVE_PATH"
